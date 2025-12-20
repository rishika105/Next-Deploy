import express from "express";
import { ECSClient } from "@aws-sdk/client-ecs";
import projectRoutes from "./routes/projectRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import cors from "cors"
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from "@prisma/client";
import deployRoutes from "./routes/deployRoutes.js";
import { kafka } from "./libs/kafkaClient.js";
import { clickhouseClient } from "./libs/clickhouseClient.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env", override: true });

const app = express();
app.use(express.json());
app.use(cors()); //allow all origins

const PORT = process.env.PORT || 9000;
const prisma = new PrismaClient();

// ECS Client
const ecsClient = new ECSClient({
  region: "us-east-1"
});


//consume logs produced in kafka topic created in script.js
const logsConsumer = kafka.consumer({ groupId: 'api-server-logs-consumer' })
const statusConsumer = kafka.consumer({ groupId: 'api-server-status-consumer' })

// Routes
app.use("/api/project", projectRoutes(ecsClient));
app.use("/api/logs", logRoutes());
app.use("/api/deployment", deployRoutes())

// consume logs and store in clickhouse db
async function initLogsConsumer() {
  try {
    await logsConsumer.connect();
    await logsConsumer.subscribe({ topics: ['container-logs'] })

    await logsConsumer.run({
      autoCommit: false,
      //read batch by batch
      eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {
        const messages = batch.messages;
        console.log(`Recieved. ${messages.length} messages..`)
        for (const message of messages) {
          const stringMsg = message.value.toString()
          const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMsg)

          //store logs in db
          await clickhouseClient.insert({
            table: 'log_events',
            values: [{ event_id: uuidv4(), deployment_id: DEPLOYMENT_ID, log }],
            format: 'JSONEachRow'
          })

          //read message so commit to kafka that it is done
          resolveOffset(message.offset)
          await commitOffsetsIfNecessary(message.offset)
          await heartbeat()
        }
      }
    })
  }
  catch (error) {
    console.log("Logs consumer error: ", error)
  }
}

//consume deployment status and update in postgres db
async function initStatusConsumer(params) {
  try {
    await statusConsumer.connect();
    await statusConsumer.subscribe({ topics: ['deployment-status'] })

    await statusConsumer.run({
      autoCommit: false,
      eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {
        const messages = batch.messages;
        console.log(`Recieved. ${messages.length} status updates..`)
        for (const message of messages) {
          const stringMsg = message.value.toString()
          const { DEPLOYMENT_ID, status, timestamp } = JSON.parse(stringMsg)

          //update deployment status in schema
          await prisma.deployment.update({
            where: { id: DEPLOYMENT_ID },
            data: { status }
          })

          //read message so commit to kafka that it is done
          resolveOffset(message.offset)
          await commitOffsetsIfNecessary(message.offset)
          await heartbeat()
        }
      }
    })
  }
  catch (error) {
    console.log("Status consumer error: ", error)
  }
}

//start both
initLogsConsumer();
initStatusConsumer();

app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

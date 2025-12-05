import express from "express";
import dotenv from "dotenv";
import { ECSClient } from "@aws-sdk/client-ecs";
import Redis from "ioredis";
import { Server } from "socket.io";
import projectRoutes from "./routes/projectRoutes.js";

import cors from "cors"
import { Kafka } from "kafkajs"
import { v4 } from 'uuid'
import { uuidv4 } from "zod";
import fs from "fs";
import path from "path";
import logRoutes from "./routes/logRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); //allow all origins

const PORT = process.env.PORT || 9000;

// ECS Client
const ecsClient = new ECSClient({
  region: "us-east-1"
});

const io = new Server({ cors: "*" });

//clickhouse db
export const clickhouseClient = createClient({
  host: process.env.CLICKHOUSE_URL,
  database: 'default',
  username: 'avnadmin',
  password: 'AVNS_2CzvvpUp28yOvJYcIrt'
})


//kafka
const kafka = new Kafka({
  clientId: `api-server`,
  brokers: [process.env.KAFKA_URL],  //SERVICE URI
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
  },
  sasl: {
    username: 'avnadmin',
    password: 'AVNS_Z2KJholFPlGfRXUZ0mP',
    mechanism: 'plain'
  }
})

//consume logs produced in kafka topic created in script.js
const consumer = Kafka.consumer({ groupId: 'api-server-logs-consumer' })

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});


io.listen(9001, () => console.log("Socket Server 9001"));

// Routes
app.use("/api/project", projectRoutes(ecsClient));
app.use("/api/logs", logRoutes());

// Kafka Consumer
async function initKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topics: ['container-logs'] })

    await consumer.run({
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
    console.log(error)
  }
}

initKafkaConsumer()


app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

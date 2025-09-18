const express = require("express");
const { generateSlug } = require("random-word-slugs");
require("dotenv").config();
const {
  ECSClient,
  RunTaskCommand,
  LaunchType,
} = require("@aws-sdk/client-ecs");
const Redis = require("ioredis");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 9000;

//using valkey uri
const subscriber = new Redis(process.env.VALKEY_URL);

const io = new Server({ cors: "*" });

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9001, () => console.log("Socket Server 9001"));

const ecsClient = new ECSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const config = {
  CLUSTER: "arn:aws:ecs:ap-south-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:ap-south-1:471112546627:task-definition/builder-task",
};

app.use(express.json());

app.post("/project", async (req, res) => {
  const { gitURL, slug } = req.body;

  //unqiue id using slug
  const projectSlug = slug ? slug : generateSlug(); //if made changes to a repo and rebuild dont make a new deployment

  //spin the container
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: LaunchType.FARGATE,
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-0c3dba2950ff1f164",
          "subnet-0920df1b364ecf2ce",
          "subnet-0f57f83eb1b74f141",
        ],
        securityGroups: ["sg-0f0e1ce8279845341"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            { name: "GIT_REPOSITORY__URL", value: gitURL },
            { name: "PROJECT_ID", value: projectSlug },
          ],
        },
      ],
    },
  });

  const response = await ecsClient.send(command);
  console.log("ECS Task started:", response.tasks?.[0]?.taskArn);

  return res.json({
    status: "queued",
    data: {
      projectSlug,
      ecsTaskArn: response.tasks?.[0]?.taskArn,
      url: `http://${projectSlug}.localhost:8000`,
    },
  });
});

async function initRedisSubscribe() {
  console.log("Subscribed to logs.....");
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

import express from "express";
import dotenv from "dotenv";
import { ECSClient } from "@aws-sdk/client-ecs";
import Redis from "ioredis";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 9000;

// ECS Client
const ecsClient = new ECSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

// Redis
const subscriber = new Redis(process.env.VALKEY_URL);
const io = new Server({ cors: "*" });

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9001, () => console.log("Socket Server 9001"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/project", projectRoutes(ecsClient));

// Redis Sub
subscriber.psubscribe("logs:*");
subscriber.on("pmessage", (pattern, channel, message) => {
  io.to(channel).emit("message", message);
});

app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

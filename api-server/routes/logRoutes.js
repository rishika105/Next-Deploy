import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { fetchLogs } from "../controllers/logsController.js";


export default function logRoutes() {
  const router = express.Router();

  router.get("/:deploymentId", ClerkExpressRequireAuth(), fetchLogs);

  return router;
}

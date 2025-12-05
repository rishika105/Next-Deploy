import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { fetchLogs } from "../controllers/logsController";

export default function logRoutes() {
  const router = express.Router();

  router.get("/:id", ClerkExpressRequireAuth(), fetchLogs());

  return router;
}

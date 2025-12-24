
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { getAnalytics, getRealTimeAnalytics } from "../controllers/analyticsController.js";

export default function analyticsRoutes() {
  const router = express.Router();

  router.get("/:subdomain", ClerkExpressRequireAuth(), getAnalytics);

  router.get("/:subdomain/realtime", ClerkExpressRequireAuth(), getRealTimeAnalytics);

  return router;
}
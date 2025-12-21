import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { connectGitHub, disconnectGitHub, getGitHubStatus, getUserRepositories, githubCallback } from "../controllers/gitController.js";

export default function gitRoutes() {
  const router = express.Router();

  // GitHub auth routes
  router.get("/connect", ClerkExpressRequireAuth(), connectGitHub);
  router.get("/callback", githubCallback);
  router.post("/disconnect", ClerkExpressRequireAuth(), disconnectGitHub);
  router.get("/status", ClerkExpressRequireAuth(), getGitHubStatus);
  router.get("/repositories", ClerkExpressRequireAuth(), getUserRepositories); // NEW

  return router;
}

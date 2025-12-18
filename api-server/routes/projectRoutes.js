import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import {
  createProject,
  getProjects,
  getProjectById,
  redeployProject,
  deleteProject,
  connectGitHub,
  githubCallback,
  disconnectGitHub,
  getGitHubStatus,
  getUserRepositories, 
} from "../controllers/projectController.js";

export default function projectRoutes(ecsClient) {
  const router = express.Router();

  // GitHub auth routes
  router.get("/github/connect", ClerkExpressRequireAuth(), connectGitHub);
  router.get("/github/callback", githubCallback);
  router.post("/github/disconnect", ClerkExpressRequireAuth(), disconnectGitHub);
  router.get("/github/status", ClerkExpressRequireAuth(), getGitHubStatus);
  router.get("/github/repositories", ClerkExpressRequireAuth(), getUserRepositories); // NEW

  // Project routes
  router.post("/deploy", ClerkExpressRequireAuth(), (req, res) =>
    createProject(req, res, ecsClient)
  );
  router.get("", ClerkExpressRequireAuth(), getProjects);
  router.get("/:projectId", ClerkExpressRequireAuth(), getProjectById);
  router.post("/:projectId/redeploy", ClerkExpressRequireAuth(), (req, res) =>
    redeployProject(req, res, ecsClient)
  );
  router.delete("/:projectId", ClerkExpressRequireAuth(), deleteProject);

  return router;
}

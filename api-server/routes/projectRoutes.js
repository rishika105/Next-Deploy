import express from "express";
import { createProject, getProjects } from "../controllers/projectController.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { checkDeploymentStatus } from "../controllers/deploymentController.js";

export default function projectRoutes(ecsClient) {
  const router = express.Router();

  router.post("/", ClerkExpressRequireAuth(), (req, res) => {
    // console.log("route reached")
    createProject(req, res, ecsClient)
  });

  router.get("/deployment/:deploymentId", ClerkExpressRequireAuth(), checkDeploymentStatus);
  router.get("", ClerkExpressRequireAuth(), getProjects )

  return router;
}

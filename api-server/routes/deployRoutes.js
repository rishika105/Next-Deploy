import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { checkDeploymentStatus, getDeployments, getDeploymentsByProjectId, } from "../controllers/deploymentController.js";

export default function deployRoutes() {
    const router = express.Router();

    router.get("/:deploymentId", ClerkExpressRequireAuth(), checkDeploymentStatus);
    router.get("", ClerkExpressRequireAuth(), getDeployments);
    router.get("/:projectId", ClerkExpressRequireAuth(), getDeploymentsByProjectId)


    return router;
}
import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { checkDeploymentStatus, getDeployments, getDeploymentsByProjectId, } from "../controllers/deploymentController.js";

export default function deployRoutes() {
    const router = express.Router();
     
    //deployment details
    router.get("/:deploymentId", ClerkExpressRequireAuth(), checkDeploymentStatus);

    //get all
    router.get("", ClerkExpressRequireAuth(), getDeployments);

    //get deployments by project id
    router.get("/project/:projectId", ClerkExpressRequireAuth(), getDeploymentsByProjectId)


    return router;
}
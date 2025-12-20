import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { getDeploymentDetails, getAllDeployments, getDeploymentsByProjectId, } from "../controllers/deploymentController.js";

export default function deployRoutes() {
    const router = express.Router();

    //get all
    router.get("", ClerkExpressRequireAuth(), getAllDeployments);

    //deployment details
    router.get("/:deploymentId", ClerkExpressRequireAuth(), getDeploymentDetails);

    //get deployments by project id
    router.get("/project/:projectId", ClerkExpressRequireAuth(), getDeploymentsByProjectId)

    return router;
}
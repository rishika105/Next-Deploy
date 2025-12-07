import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { checkDeploymentStatus } from "../controllers/deploymentController.js";

export default function deployRoutes() {
    const router = express.Router();

    router.get("/:deploymentId", ClerkExpressRequireAuth(), checkDeploymentStatus);


    return router;
}

import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { disableWebhook, getWebhookStatus, handleWebhook, setupWebhook } from "../controllers/webhookController.js";


export default function webHookRoutes(ecsClient) {
    const router = express.Router();

    // Public endpoint - GitHub calls this
    router.post("", express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf.toString();
        }
    }), (req, res) => handleWebhook(req, res, ecsClient));

    // Protected endpoints
    router.post("/:projectId/setup", ClerkExpressRequireAuth(), setupWebhook);
    router.post("/:projectId/disable", ClerkExpressRequireAuth(), disableWebhook);
    router.get("/:projectId/status", ClerkExpressRequireAuth(), getWebhookStatus);

    return router;
}

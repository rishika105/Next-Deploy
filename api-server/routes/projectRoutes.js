import express from "express";
import { createProject } from "../controllers/projectController.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

export default function projectRoutes(ecsClient) {
  const router = express.Router();

  router.post("/", ClerkExpressRequireAuth(), (req, res) => {
    // console.log("route reached")
    createProject(req, res, ecsClient)
  });

  return router;
}

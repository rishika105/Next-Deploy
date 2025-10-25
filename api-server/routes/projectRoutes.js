import express from "express";
import { createProject } from "../controllers/projectController.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

export default function projectRoutes(ecsClient) {
  const router = express.Router();

  router.post("/", verifyFirebaseToken, (req, res) => createProject(req, res, ecsClient));

  return router;
}

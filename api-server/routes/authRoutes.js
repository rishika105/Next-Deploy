import express from "express";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";
import { registerOrLogin } from "../controllers/authController.js";

export default function authRoutes() {
  const router = express.Router();
  router.post("/sign", verifyFirebaseToken, registerOrLogin);
  return router;
}

import express from "express";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import {
  createProject,
  getAllProjects,
  getProjectById,
  redeployProject,
  deleteProject,
  updateProject,
} from "../controllers/projectController.js";

export default function projectRoutes(ecsClient) {
  const router = express.Router();

  // deploy
  router.post("/deploy", ClerkExpressRequireAuth(), (req, res) =>
    createProject(req, res, ecsClient)
  );
   
  //get
  router.get("", ClerkExpressRequireAuth(), getAllProjects);  //search here only
  // router.get("/search", ClerkExpressRequireAuth(), searchProject) //static route first

  router.get("/:projectId", ClerkExpressRequireAuth(), getProjectById); //then dyanmic !***imp

  //redeploy
  router.post("/:projectId/redeploy", ClerkExpressRequireAuth(), (req, res) =>
    redeployProject(req, res, ecsClient)
  );
  
  //update root dir
  router.patch("/:projectId", ClerkExpressRequireAuth(), updateProject);
   
  //delete
  router.delete("/:projectId", ClerkExpressRequireAuth(), deleteProject);

  

  return router;
}

import express from "express";
import { checkGitURL, createProject, deleteProject, getProjectById, getProjects, redeployProject } from "../controllers/projectController.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

export default function projectRoutes(ecsClient) {
  const router = express.Router();

  //check duplicate URL
  router.get("/check/:projectId", ClerkExpressRequireAuth(), checkGitURL);

  //create
  router.post("/", ClerkExpressRequireAuth(), (req, res) => {
    // console.log("route reached")
    createProject(req, res, ecsClient)
  });

  //get all
  router.get("", ClerkExpressRequireAuth(), getProjects)

  //get project details by id
  router.get("/:projectId", ClerkExpressRequireAuth(), getProjectById)

  //redploy
  router.post("/project/:projectId/redeploy", ClerkExpressRequireAuth(), (req, res) => {
    redeployProject(req, res, req.app.get("ecsClient"));
  });

  // Delete project
  router.delete("/:projectId", ClerkExpressRequireAuth(), deleteProject);


  return router;
}

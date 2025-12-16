import express from "express";
import { checkGitURL, createProject, deleteProject, getProjectById, getProjects, updateProject } from "../controllers/projectController.js";
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

  // Update project
  router.put("/:projectId", ClerkExpressRequireAuth(), updateProject);

  // Delete project
  router.delete("/:projectId", ClerkExpressRequireAuth(), deleteProject);


  return router;
}

import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/async-handler.js";


const prisma = new PrismaClient();

/* ===========================
   GET ALL DEPLOYMENTS
=========================== */
export const getAllDeployments = asyncHandler(async (req, res) => {
  const id = req.auth.userId;

  if (!id) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const deployments = await prisma.deployment.findMany({
    where: { userId: id },
    include: { project: true },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return res.status(200).json({
    success: true,
    deployments,
  });
});

/* ===========================
   GET DEPLOYMENT DETAILS
=========================== */
export const getDeploymentDetails = asyncHandler(async (req, res) => {
  const { deploymentId } = req.params;

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true },
  });

  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "Deployment not found",
    });
  }

  return res.status(200).json({
    success: true,
    id: deployment.id,
    status: deployment.status,
    projectSlug: deployment.project.subDomain,
    projectName: deployment.project.name,
    envVariables: deployment.project.envVariables,
    projectId: deployment.projectId,
    url: `http://${deployment.project.subDomain}.localhost:8000`,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
  });
});

/* ===========================
   GET DEPLOYMENTS BY PROJECT ID
=========================== */
export const getDeploymentsByProjectId = asyncHandler(async (req, res) => {
  const id = req.auth.userId;
  const { projectId } = req.params;

  if (!id || !projectId) {
    return res.status(404).json({
      success: false,
      message: "User or project not found",
    });
  }

  const deployments = await prisma.deployment.findMany({
    where: { userId: id, projectId },
    include: { project: true },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return res.status(200).json({
    success: true,
    deployments,
  });
});

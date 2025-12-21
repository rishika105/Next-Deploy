import { generateSlug } from "random-word-slugs";
import { PrismaClient } from "@prisma/client";
import {
  checkProjectExists,
  checkSlugAvailable,
  createECSTask,
  deleteS3ProjectFiles,
  getUser,
  parseGitHubUrl,
  verifyRepoAccess,
} from "../utils/helpers.js";
import { asyncHandler } from "../utils/async-handler.js";


const prisma = new PrismaClient();

// ============================================
// CREATE PROJECT / DEPLOYMENT
// ============================================

export const createProject = asyncHandler(async (req, res, ecsClient) => {
  const {
    gitURL,
    slug,
    projectName,
    framework = "react",
    rootDirectory = "",
    envVariables = {},
  } = req.body;

  const userId = req.auth.userId;

  if (!userId || !projectName || !gitURL) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  // Get user and verify GitHub connection
  const user = await getUser(userId);

  // Parse and verify repository access
  const { owner, repoName } = parseGitHubUrl(gitURL);
  await verifyRepoAccess(user.githubAccessToken, owner, repoName);

  // Check for duplicate deployment
  const existingProject = await checkProjectExists(userId, gitURL);
  if (existingProject) {
    return res.status(409).json({
      success: false,
      message: "Repository already deployed",
      existingProject: {
        id: existingProject.id,
        name: existingProject.name,
        subDomain: existingProject.subDomain,
        url: `http://${existingProject.subDomain}.localhost:8000`,
      },
    });
  }

  // Generate and verify slug
  const projectSlug = slug || generateSlug();
  const slugAvailable = await checkSlugAvailable(projectSlug);

  if (!slugAvailable) {
    return res.status(409).json({
      success: false,
      message: `Subdomain "${projectSlug}" is already taken`,
    });
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      userId,
      name: projectName,
      gitURL,
      subDomain: projectSlug,
      framework,
      rootDirectory,
      envVariables,
    },
  });

  // Create deployment
  const deployment = await prisma.deployment.create({
    data: {
      userId,
      projectId: project.id,
      status: "QUEUED",
    },
  });

  // Start ECS task
  const response = await createECSTask(
    ecsClient,
    project,
    deployment,
    envVariables,
    user.githubAccessToken
  );

  // Update deployment status
  await prisma.deployment.update({
    where: { id: deployment.id },
    data: { status: "IN_PROGRESS" },
  });

  console.log(`Deployed: http://${projectSlug}.localhost:8000`);

  return res.json({
    success: true,
    status: "queued",
    data: {
      projectId: project.id,
      deploymentId: deployment.id,
      projectSlug,
      ecsTaskArn: response.tasks?.[0]?.taskArn,
      url: `http://${projectSlug}.localhost:8000`,
    },
  });
});

// ============================================
// GET ALL PROJECTS
// ============================================

export const getAllProjects = asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { search } = req.query;

  if (!userId) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const projects = await prisma.project.findMany({
    where: {
      userId,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      gitURL: true,
      subDomain: true,
      createdAt: true,
      Deployment: {
        select: {
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return res.status(200).json({
    success: true,
    projects,
  });
});

// ============================================
// GET PROJECT BY ID
// ============================================

export const getProjectById = asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  return res.status(200).json({
    success: true,
    project,
  });
});

// ============================================
// UPDATE PROJECT
// ============================================

export const updateProject = asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;
  const { rootDirectory } = req.body; //for now only root directory

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Delete deployments first
  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      rootDirectory: rootDirectory,
    },
  });

  return res.status(200).json({
    success: true,
    updatedProject,
    message: "Project updated successfully",
  });
});

// ============================================
// REDEPLOY PROJECT
// ============================================

export const redeployProject = asyncHandler(async (req, res, ecsClient) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;
  const { envVariables } = req.body; // Can be empty object {} or null

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  const user = await getUser(userId);

  // Always update env variables - even if empty/deleted
  // partial deletion of env vars also handled it replaces the entire obj
  let updatedEnvVars = project.envVariables;

  if (envVariables !== undefined && envVariables !== null) {
    // Update database with new env vars (or empty object if all removed)
    await prisma.project.update({
      where: { id: projectId },
      data: { envVariables: envVariables },
    });
    updatedEnvVars = envVariables;

    console.log(
      `Updated env variables for project ${projectId}:`,
      Object.keys(envVariables).length > 0
        ? Object.keys(envVariables)
        : "All removed"
    );
  }

  const deployment = await prisma.deployment.create({
    data: {
      userId,
      projectId: project.id,
      status: "QUEUED",
    },
  });

  // Pass the updated env vars to ECS
  await createECSTask(
    ecsClient,
    project,
    deployment,
    updatedEnvVars, // Use updated vars
    user.githubAccessToken
  );

  await prisma.deployment.update({
    where: { id: deployment.id },
    data: { status: "IN_PROGRESS" },
  });

  return res.json({
    success: true,
    deploymentId: deployment.id,
    status: "IN_PROGRESS",
    url: `http://${project.subDomain}.localhost:8000`,
    message: "Redeployment started successfully",
  });
});

// ============================================
// DELETE PROJECT
// ============================================

export const deleteProject = asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  console.log(`Deleting project: ${project.name} (${project.subDomain})`);

  // ✅ STEP 1: Delete S3 files
  try {
    const s3Result = await deleteS3ProjectFiles(project.subDomain);
    console.log(`S3 cleanup: ${s3Result.deleted} files deleted`);

    if (s3Result.errors && s3Result.errors.length > 0) {
      console.warn("Some S3 files failed to delete:", s3Result.errors);
    }
  } catch (s3Error) {
    // Log error but continue with database deletion
    console.error("S3 deletion failed (non-critical):", s3Error);
  }

  // ✅ STEP 2: Delete deployments
  await prisma.deployment.deleteMany({
    where: { projectId },
  });

  // ✅ STEP 3: Delete project
  await prisma.project.delete({
    where: { id: projectId },
  });

  console.log(`✅ Project ${project.name} deleted successfully`);

  return res.status(200).json({
    success: true,
    message: "Project and associated files deleted successfully",
  });
});

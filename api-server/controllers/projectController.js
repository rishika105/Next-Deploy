import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import { PrismaClient } from "@prisma/client";
import { Octokit } from "@octokit/rest";
import axios from "axios";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";


const s3Client = new S3Client({
  region: "us-east-1"
});

const config = {
  CLUSTER: "arn:aws:ecs:us-east-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:us-east-1:471112546627:task-definition/builder-task",
};

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

const getUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { githubAccessToken: true, githubUsername: true }
  });

  if (!user?.githubAccessToken) {
    throw new Error("GITHUB_NOT_CONNECTED");
  }

  return user;
};

const parseGitHubUrl = (gitURL) => {
  const repoMatch = gitURL.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!repoMatch) {
    throw new Error("INVALID_GITHUB_URL");
  }
  return { owner: repoMatch[1], repoName: repoMatch[2] };
};


// github read write permission access
const verifyRepoAccess = async (githubToken, owner, repoName) => {
  const octokit = new Octokit({ auth: githubToken });

  try {
    await octokit.repos.get({ owner, repo: repoName });
    return true;
  } catch (error) {
    if (error.status === 404) {
      throw new Error("REPO_ACCESS_DENIED");
    }
    throw error;
  }
};

const checkProjectExists = async (userId, gitURL) => {
  return await prisma.project.findFirst({
    where: { userId, gitURL }
  });
};

const checkSlugAvailable = async (slug) => {
  const existing = await prisma.project.findFirst({
    where: { subDomain: slug }
  });
  return !existing;
};

const createECSTask = async (ecsClient, project, deployment, envVariables, githubToken, branch = "main") => {
  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: LaunchType.FARGATE,
    count: 1,
    taskRoleArn: "arn:aws:iam::471112546627:role/vercel-clone-task-role",
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-048917ed4b29cacf3",
          "subnet-0e3876698af79dea0",
          "subnet-0c9f495b29954cd5c",
        ],
        securityGroups: ["sg-02f3bcf249107bc7b"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            { name: "GIT_REPOSITORY_URL", value: project.gitURL },
            { name: "SUB_DOMAIN", value: project.subDomain },
            { name: "PROJECT_ID", value: project.id },
            { name: "DEPLOYMENT_ID", value: deployment.id },
            { name: "ROOT_DIRECTORY", value: project.rootDirectory || "" },
            { name: "ENV_VARIABLES", value: JSON.stringify(envVariables) },
            { name: "GITHUB_TOKEN", value: githubToken }, // ✅ Pass token to container
            { name: "BRANCH", value: branch },
          ],
        },
      ],
    },
  });

  return await ecsClient.send(command);
};

// delete all S3 files for a project
const deleteS3ProjectFiles = async (subDomain) => {
  try {
    console.log(`🗑️ Deleting S3 files for subdomain: ${subDomain}`);

    // List all objects with the prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: "next-deploy-outputs5",
      Prefix: `__outputs/${subDomain}/`
    });

    const listedObjects = await s3Client.send(listCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log(`No files found for ${subDomain}`);
      return { deleted: 0 };
    }

    // Delete all objects
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: "next-deploy-outputs5",
      Delete: {
        Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
        Quiet: false
      }
    });

    const deleteResult = await s3Client.send(deleteCommand);

    console.log(`✅ Deleted ${listedObjects.Contents.length} files from S3`);

    return {
      deleted: listedObjects.Contents.length,
      errors: deleteResult.Errors || []
    };

  } catch (error) {
    console.error("Error deleting S3 files:", error);
    throw error;
  }
};


// ============================================
// PROJECT DEPLOYMENT
// ============================================

export const createProject = async (req, res, ecsClient) => {
  const {
    gitURL,
    slug,
    projectName,
    framework = "react",
    rootDirectory = "",
    envVariables = {}
  } = req.body;

  const userId = req.auth.userId;

  if (!userId || !projectName || !gitURL) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
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
          url: `http://${existingProject.subDomain}.localhost:8000`
        }
      });
    }

    // Generate and verify slug
    const projectSlug = slug || generateSlug();
    const slugAvailable = await checkSlugAvailable(projectSlug);

    if (!slugAvailable) {
      return res.status(409).json({
        success: false,
        message: `Subdomain "${projectSlug}" is already taken`
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
        envVariables
      }
    });

    // Create deployment
    const deployment = await prisma.deployment.create({
      data: {
        userId,
        projectId: project.id,
        status: "QUEUED"
      }
    });

    // Start ECS task
    const response = await createECSTask(ecsClient, project, deployment, envVariables, user.githubAccessToken);

    // Update deployment status
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "IN_PROGRESS" }
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

  } catch (error) {
    console.error("Deployment error:", error);

    if (error.message === "GITHUB_NOT_CONNECTED") {
      return res.status(403).json({
        success: false,
        message: "Please connect your GitHub account first",
        needsGitHubAuth: true
      });
    }

    if (error.message === "INVALID_GITHUB_URL") {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub URL"
      });
    }

    if (error.message === "REPO_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this repository"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to start deployment"
    });
  }
};

// ============================================
// PROJECT MANAGEMENT
// ============================================

export const getAllProjects = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting projects",
    });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    return res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    console.error("Get project error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting project"
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { projectId } = req.params;
    const { rootDirectory } = req.body; //for now only root directory

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Delete deployments first
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        rootDirectory: rootDirectory,
      },
    })

    // console.log(updatedProject);

    return res.status(200).json({
      success: true,
      updatedProject,
      message: "Project updated successfully"
    });
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update project"
    });
  }
};

export const redeployProject = async (req, res, ecsClient) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;
  const { envVariables } = req.body; // Can be empty object {} or null

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
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
        data: { envVariables: envVariables }
      });
      updatedEnvVars = envVariables;

      console.log(`Updated env variables for project ${projectId}:`,
        Object.keys(envVariables).length > 0
          ? Object.keys(envVariables)
          : "All removed"
      );
    }

    const deployment = await prisma.deployment.create({
      data: {
        userId,
        projectId: project.id,
        status: "QUEUED"
      }
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
      data: { status: "IN_PROGRESS" }
    });

    return res.json({
      success: true,
      deploymentId: deployment.id,
      status: "IN_PROGRESS",
      url: `http://${project.subDomain}.localhost:8000`,
      message: "Redeployment started successfully"
    });

  } catch (error) {
    console.error("Redeploy error:", error);

    if (error.message === "GITHUB_NOT_CONNECTED") {
      return res.status(403).json({
        success: false,
        message: "GitHub not connected"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to redeploy project"
    });
  }
};

// delete S3 files , deployments and project datas
export const deleteProject = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
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
      where: { projectId }
    });

    // ✅ STEP 3: Delete project
    await prisma.project.delete({
      where: { id: projectId }
    });

    console.log(`✅ Project ${project.name} deleted successfully`);

    return res.status(200).json({
      success: true,
      message: "Project and associated files deleted successfully"
    });

  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete project"
    });
  }
};





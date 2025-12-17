import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import { PrismaClient } from "@prisma/client";

const config = {
  CLUSTER: "arn:aws:ecs:us-east-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:us-east-1:471112546627:task-definition/builder-task",
};

const prisma = new PrismaClient();

// Create project deployment
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

  if (!userId) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // Validation
  if (!gitURL || !projectName) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: gitURL and projectName"
    });
  }

  try {
    // ✅ CHECK FOR DUPLICATE GIT URL FOR THIS USER
    const existingProjectWithGitURL = await prisma.project.findFirst({
      where: {
        userId: userId,
        gitURL: gitURL
      }
    });

    if (existingProjectWithGitURL) {
      return res.status(409).json({
        success: false,
        message: "Project with this Git URL already exists",
        existingProject: {
          id: existingProjectWithGitURL.id,
          name: existingProjectWithGitURL.name,
          subDomain: existingProjectWithGitURL.subDomain,
          url: `http://${existingProjectWithGitURL.subDomain}.localhost:8000`
        }
      });
    }

    // Generate slug if user doesn't provide custom domain
    const projectSlug = slug || generateSlug();

    // Check if slug already taken
    const existingProject = await prisma.project.findFirst({
      where: { subDomain: projectSlug }
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: `Subdomain "${projectSlug}" is already taken. Please choose another.`
      });
    }

    // ✅ CREATE PROJECT IN DATABASE
    const project = await prisma.project.create({
      data: {
        userId: userId,
        name: projectName,
        gitURL: gitURL,
        subDomain: projectSlug,
        framework,
        rootDirectory,
        envVariables
      }
    });

    // ✅ CREATE DEPLOYMENT WITH STATUS: QUEUED
    const deployment = await prisma.deployment.create({
      data: {
        userId: userId,
        projectId: project.id,
        status: "QUEUED"
      }
    });

    // Spin up container/run task
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
              { name: "GIT_REPOSITORY_URL", value: gitURL },
              { name: "SUB_DOMAIN", value: projectSlug },
              { name: "PROJECT_ID", value: project.id },
              { name: "DEPLOYMENT_ID", value: deployment.id },
              { name: "ROOT_DIRECTORY", value: rootDirectory },
              { name: "ENV_VARIABLES", value: JSON.stringify(envVariables) },
            ],
          },
        ],
      },
    });

    const response = await ecsClient.send(command);
    console.log("ECS Task started:", response.tasks?.[0]?.taskArn);

    // ✅ UPDATE STATUS TO IN_PROGRESS
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "IN_PROGRESS" }
    });

    console.log(`Deployed link: http://${projectSlug}.localhost:8000`);

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
  } catch (err) {
    console.error("ECS Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to start ECS task"
    });
  }
};

// Get all projects of user
export const getProjects = async (req, res) => {
  try {
    const id = req.auth.userId;
    if (!id) {
      return res.status(404).json({
        success: true,
        message: "User not found"
      });
    }

    const projects = await prisma.project.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' }
    });

    if (projects.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json({
      success: true,
      projects
    });
  } catch (error) {
    console.log("Get projects error: ", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting projects"
    });
  }
};

// ✅ NEW: Get single project by ID
export const getProjectById = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID required"
      });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId
      }
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
    }
    );
  } catch (error) {
    console.log("Get project by ID error: ", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting project"
    });
  }
};

// ✅ NEW: Check if Git URL already exists for user
export const checkGitURL = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { gitURL } = req.query;

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!gitURL) {
      return res.status(400).json({
        success: false,
        message: "Git URL required"
      });
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        userId: userId,
        gitURL: gitURL
      }
    });

    if (existingProject) {
      return res.status(200).json({
        success: true,
        exists: true,
        project: {
          id: existingProject.id,
          name: existingProject.name,
          subDomain: existingProject.subDomain,
          url: `http://${existingProject.subDomain}.localhost:8000`
        }
      });
    }

    return res.status(200).json({
      success: true,
      exists: false
    });
  } catch (error) {
    console.log("Check Git URL error: ", error);
    return res.status(500).json({
      success: false,
      message: "Server error checking Git URL"
    });
  }
};

//redeploy
export const redeployProject = async (req, res, ecsClient) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;
  //if update env and deploy is triggered
  const { envVariables } = req.body;


  if (!userId) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    // Get current project details
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Update project with new env variables
    const updatedProject = project;
    if (envVariables) {
      updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { envVariables }
      });
    }

    // Create new deployment
    const deployment = await prisma.deployment.create({
      data: {
        userId: userId,
        projectId: project.id,
        status: "QUEUED"
      }
    });

    // Spin up ECS task with current project settings
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
              { name: "ENV_VARIABLES", value: JSON.stringify(updatedProject.envVariables) },
            ],
          },
        ],
      },
    });

    await ecsClient.send(command);

    // Update deployment status
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "IN_PROGRESS" }
    });

    return res.json({
      deploymentId: deployment.id,
      status: "IN_PROGRESS",
      url: `http://${project.subDomain}.localhost:8000`,
      message: "Redeployment started successfully"
    });

  } catch (error) {
    console.log("Redeploy error: ", error);
    return res.status(500).json({ error: "Server error redeploying project" });
  }
};


// Delete project
export const deleteProject = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Delete associated deployments first
    await prisma.deployment.deleteMany({
      where: { projectId: projectId }
    });

    // Delete project
    await prisma.project.delete({
      where: { id: projectId }
    });

    return res.status(200).json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.log("Delete project error: ", error);
    return res.status(500).json({ success: false, message: "Server error deleting project" });
  }
};
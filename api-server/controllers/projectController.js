import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";
import { PrismaClient } from "@prisma/client";
import { Octokit } from "@octokit/rest";
import axios from "axios";

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

// ============================================
// GITHUB AUTH ENDPOINTS
// ============================================

export const connectGitHub = (req, res) => {
  const userId = req.auth.userId;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_CALLBACK_URL}&scope=repo&state=${userId}`;
  res.redirect(githubAuthUrl);
};

export const githubCallback = async (req, res) => {
  const { code, state: userId } = req.query;

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;
    const octokit = new Octokit({ auth: accessToken });
    const { data: githubUser } = await octokit.users.getAuthenticated();

    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        githubAccessToken: accessToken,
        githubUsername: githubUser.login
      },
      create: {
        clerkId: userId,
        githubAccessToken: accessToken,
        githubUsername: githubUser.login
      }
    });

    res.redirect(`${process.env.FRONTEND_URL}/deploy?github=connected`);
  } catch (error) {
    console.error("GitHub OAuth Error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/deploy?github=error`);
  }
};

export const disconnectGitHub = async (req, res) => {
  const userId = req.auth.userId;

  await prisma.user.update({
    where: { clerkId: userId },
    data: {
      githubAccessToken: null,
      githubUsername: null
    }
  });

  res.json({ success: true, message: "GitHub disconnected" });
};

export const getGitHubStatus = async (req, res) => {
  const userId = req.auth.userId;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { githubUsername: true, githubAccessToken: true }
  });

  res.json({
    connected: !!user?.githubUsername,
    username: user?.githubUsername
  });
};

// ============================================
//  GET USER'S GITHUB REPOSITORIES
// ============================================

export const getUserRepositories = async (req, res) => {
  const userId = req.auth.userId;

  try {
    const user = await getUser(userId);
    const octokit = new Octokit({ auth: user.githubAccessToken });

    // Get user's repos (both owned and collaborated)
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator'
    });

    // Get already deployed projects to mark them
    const deployedProjects = await prisma.project.findMany({
      where: { userId },
      select: { gitURL: true }
    });

    const deployedUrls = new Set(deployedProjects.map(p => p.gitURL));

    const formattedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      private: repo.private,
      description: repo.description,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      isDeployed: deployedUrls.has(repo.html_url)
    }));

    res.json({
      success: true,
      repositories: formattedRepos
    });
  } catch (error) {
    if (error.message === "GITHUB_NOT_CONNECTED") {
      return res.status(403).json({
        success: false,
        message: "GitHub not connected",
        needsGitHubAuth: true
      });
    }
    console.error("Fetch repositories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch repositories"
    });
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
    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
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
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // 🔥 only latest deployment
        },
      },
    });

    // console.log(projects)

    return res.status(200).json({
      success: true,
      projects,

    });
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting projects"
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

export const redeployProject = async (req, res, ecsClient) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;
  const { envVariables = null } = req.body;
  const user = await getUser(userId);

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

    // Update env variables if provided
    if (envVariables) {
      await prisma.project.update({
        where: { id: projectId },
        data: { envVariables }
      });
    }

    // Create new deployment
    const deployment = await prisma.deployment.create({
      data: {
        userId,
        projectId: project.id,
        status: "QUEUED"
      }
    });

    // Start ECS task
    await createECSTask(ecsClient, project, deployment, envVariables || project.envVariables, user.githubAccessToken);

    // Update status
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "IN_PROGRESS" }
    });

    return res.json({
      success: true,
      deploymentId: deployment.id,
      status: "IN_PROGRESS",
      url: `http://${project.subDomain}.localhost:8000`
    });
  } catch (error) {
    console.error("Redeploy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to redeploy project"
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

    // Delete deployments first
    await prisma.deployment.deleteMany({
      where: { projectId }
    });

    // Delete project
    await prisma.project.delete({
      where: { id: projectId }
    });

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete project"
    });
  }
};
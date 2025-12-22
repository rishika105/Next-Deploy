
import { PrismaClient } from "@prisma/client";
import { Octokit } from "@octokit/rest";
import { asyncHandler } from "../utils/async-handler.js";
import { verifyGitHubSignature } from "../utils/verifyGitSign.js";
import { createECSTask } from "../utils/projectHelpers.js";

const prisma = new PrismaClient();

// ============================================
// SETUP WEBHOOK FOR PROJECT
// ============================================
export const setupWebhook = async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;

  try {
    // Get project and user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Get user's GitHub token
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { githubAccessToken: true }
    });

    if (!user?.githubAccessToken) {
      return res.status(403).json({
        success: false,
        message: "GitHub not connected"
      });
    }

    // Parse repo owner and name
    const repoMatch = project.gitURL.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!repoMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub URL"
      });
    }

    const [, owner, repo] = repoMatch;
    const octokit = new Octokit({ auth: user.githubAccessToken });

    // Check if webhook already exists
    const { data: existingHooks } = await octokit.repos.listWebhooks({
      owner,
      repo
    });

    const webhookUrl = `${process.env.BACKEND_URL}/api/webhook`;
    const existingHook = existingHooks.find(hook => hook.config.url === webhookUrl);

    let webhookId;

    if (existingHook) {
      webhookId = existingHook.id;
    } else {
      // Create new webhook
      const { data: webhook } = await octokit.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: process.env.GITHUB_WEBHOOK_SECRET,
          insecure_ssl: "0"
        },
        events: ["push"],
        active: true
      });

      webhookId = webhook.id;
    }

    // Update project with webhook info
    await prisma.project.update({
      where: { id: projectId },
      data: {
        webhookEnabled: true,
        webhookId: webhookId.toString()
      }
    });

    return res.json({
      success: true,
      message: "Auto-deploy enabled",
      webhookId
    });

  } catch (error) {
    console.error("Setup webhook error:", error);

    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Repository not found or no permission"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to setup webhook"
    });
  }
};

// ============================================
// DISABLE WEBHOOK FOR PROJECT
// ============================================
export const disableWebhook = asyncHandler(async (req, res) => {
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

  if (!project.webhookEnabled || !project.webhookId) {
    return res.status(400).json({
      success: false,
      message: "Webhook not enabled"
    });
  }

  // Get user's GitHub token
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { githubAccessToken: true }
  });

  if (user?.githubAccessToken) {
    const repoMatch = project.gitURL.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (repoMatch) {
      const [, owner, repo] = repoMatch;
      const octokit = new Octokit({ auth: user.githubAccessToken });

      try {
        await octokit.repos.deleteWebhook({
          owner,
          repo,
          hook_id: parseInt(project.webhookId)
        });
      } catch (error) {
        console.error("Error deleting webhook from GitHub:", error);
      }
    }
  }

  // Update project
  await prisma.project.update({
    where: { id: projectId },
    data: {
      webhookEnabled: false,
      webhookId: null
    }
  });

  return res.json({
    success: true,
    message: "Auto-deploy disabled"
  });

});

// ============================================
// HANDLE INCOMING WEBHOOK FROM GITHUB
// ============================================
export const handleWebhook = asyncHandler(async (req, res, ecsClient) => {
  // Verify signature
  if (!verifyGitHubSignature(req)) {
    console.error("Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.headers["x-github-event"];

  // We only care about push events
  if (event !== "push") {
    return res.status(200).json({ message: "Event ignored" });
  }

  const { repository, ref, commits, pusher } = req.body;

  // Only deploy on push to default branch
  const branch = ref.split("/").pop();

  console.log(`Webhook received: ${repository.full_name} - ${branch} - ${commits.length} commits`);

  // Find project by git URL
  const project = await prisma.project.findFirst({
    where: {
      gitURL: repository.html_url,
      webhookEnabled: true
    },
    include: {
      user: {
        select: {
          githubAccessToken: true
        }
      }
    }
  });

  if (!project) {
    console.log("No project found for webhook");
    return res.status(200).json({ message: "No matching project found" });
  }

  if (!project.user?.githubAccessToken) {
    console.error("GitHub token not found for user");
    return res.status(200).json({ message: "GitHub token missing" });
  }

  // Create new deployment with commit info
  const deployment = await prisma.deployment.create({
    data: {
      userId: project.userId,
      projectId: project.id,
      status: "QUEUED",
      commitHash: commits[0]?.id?.substring(0, 7),
      commitMessage: commits[0]?.message,
      commitAuthor: pusher.name,
      branch: branch
    }
  });


  // Start ECS task
  await createECSTask(
    ecsClient,
    project,
    deployment,
    project.envVariables,
    project.user.githubAccessToken
  );

  // Update deployment status
  await prisma.deployment.update({
    where: { id: deployment.id },
    data: { status: "IN_PROGRESS" }
  });

  console.log(`Auto-deployment started for ${project.name} - Deployment ID: ${deployment.id}`);

  return res.status(200).json({
    success: true,
    message: "Deployment triggered",
    deploymentId: deployment.id
  });
});

// ============================================
// GET WEBHOOK STATUS FOR PROJECT
// ============================================
export const getWebhookStatus = asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: {
        webhookEnabled: true,
        webhookId: true
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    return res.json({
      success: true,
      webhookEnabled: project.webhookEnabled || false,
      webhookId: project.webhookId
    });
});
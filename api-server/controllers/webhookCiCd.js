import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { Octokit } from "@octokit/rest";

const prisma = new PrismaClient();

const config = {
  CLUSTER: "arn:aws:ecs:us-east-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:us-east-1:471112546627:task-definition/builder-task",
};

// ============================================
// HELPER: Verify GitHub Webhook Signature
// ============================================
const verifyGitHubSignature = (req) => {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
};

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

    const webhookUrl = `${process.env.BACKEND_URL}/api/project/webhook`;
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
export const disableWebhook = async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;

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

  } catch (error) {
    console.error("Disable webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disable webhook"
    });
  }
};

// ============================================
// HANDLE INCOMING WEBHOOK FROM GITHUB
// ============================================
export const handleWebhook = async (req, res, ecsClient) => {
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

  try {
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
              { name: "ENV_VARIABLES", value: JSON.stringify(project.envVariables) },
              { name: "BRANCH", value: branch },
              { name: "COMMIT_HASH", value: commits[0]?.id },
              { name: "GITHUB_TOKEN", value: project.user.githubAccessToken } // ✅ Pass token
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

    console.log(`Auto-deployment started for ${project.name} - Deployment ID: ${deployment.id}`);

    return res.status(200).json({
      success: true,
      message: "Deployment triggered",
      deploymentId: deployment.id
    });

  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

// ============================================
// GET WEBHOOK STATUS FOR PROJECT
// ============================================
export const getWebhookStatus = async (req, res) => {
  const userId = req.auth.userId;
  const { projectId } = req.params;

  try {
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

  } catch (error) {
    console.error("Get webhook status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get webhook status"
    });
  }
};
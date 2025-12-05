import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { error } from "console";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client"

const config = {
  CLUSTER: "arn:aws:ecs:us-east-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:us-east-1:471112546627:task-definition/builder-task",
};

const prisma = new PrismaClient()

export const createProject = async (req, res, ecsClient) => {
  const userId = req.auth.userId; // ✅ Clerk provides this
  console.log("userId: ", userId)
  if (!userId) {
    return res.status(404).json({ error: "User not found" })
  }
  //  console.log(gitURL)

  //validation
  const schema = z.object({
    projectName: z.string(),
    gitURL: z.string(),
  })

  const safeParseResult = schema.safeParse(req.body)
  if (safeParseResult.error) return res.staus(400).json({ error: "Fields are invalid" })

  //validated data
  const { projectName, gitURL } = safeParseResult.data

  try {
    //generate if user dosent give a custom domain
    const projectSlug = slug || generateSlug();

    //check if slug already taken
    const existingProject = await prisma.project.findFirst({
      where: { subDomain: projectSlug }
    });

    if (existingProject) {
      return res.status(409).json({
        error: `Slug "${projectSlug}" is already taken. Please choose another.`
      });
    }

    // ✅ CREATE PROJECT IN DATABASE
    const project = await prisma.project.create({
      data: {
        userId: userId,
        name: projectName,
        gitURL: gitURL,
        subDomain: projectSlug
      }
    });

    // ✅ CREATE DEPLOYMENT WITH STATUS: QUEUED
    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        status: "QUEUED" // Initial status
      }
    });

    //spin up a container/run task
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

    console.log(`Deployed link: http://${projectSlug}.localhost:8000 `)

    //the container deployed the static files
    //request to proxy that will route to the deployed url of s3
    //REDIRECT
    //https://myproject-123.example.com/GET-REQUEST-REVERSE-PROXYURL => https://s3.amazonaws.com/outputs/__outputs/myproject-123/index.html
    //send response to frontend
    return res.json({
      status: "queued",
      data: {
        projectSlug,
        ecsTaskArn: response.tasks?.[0]?.taskArn,
        url: `http://${projectSlug}.localhost:8000`,
      },
    });
  } catch (err) {
    console.error("ECS Error:", err);
    res.status(500).json({ error: "Failed to start ECS task" });
  }
};



export const checkDeploymentStatus = async (req, res) => {
  const { deploymentId } = req.params;

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true }
  });

  if (!deployment) {
    return res.status(404).json({ error: "Deployment not found" });
  }

  return res.json({
    id: deployment.id,
    status: deployment.status,
    projectSlug: deployment.project.subDomain,
    url: `http://${deployment.project.subDomain}.localhost:8000`,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt
  });
}
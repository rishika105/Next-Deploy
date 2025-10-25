import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";

const config = {
  CLUSTER: "arn:aws:ecs:ap-south-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:ap-south-1:471112546627:task-definition/builder-task",
};

export const createProject = async (req, res, ecsClient) => {
  const { gitURL, slug } = req.body;

  try {
    const projectSlug = slug || generateSlug();

    const command = new RunTaskCommand({
      cluster: config.CLUSTER,
      taskDefinition: config.TASK,
      launchType: LaunchType.FARGATE,
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets: [
            "subnet-0c3dba2950ff1f164",
            "subnet-0920df1b364ecf2ce",
            "subnet-0f57f83eb1b74f141",
          ],
          securityGroups: ["sg-0f0e1ce8279845341"],
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: "builder-image",
            environment: [
              { name: "GIT_REPOSITORY__URL", value: gitURL },
              { name: "PROJECT_ID", value: projectSlug },
            ],
          },
        ],
      },
    });

    const response = await ecsClient.send(command);
    console.log("ECS Task started:", response.tasks?.[0]?.taskArn);

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

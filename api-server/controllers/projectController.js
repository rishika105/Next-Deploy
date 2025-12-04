import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { generateSlug } from "random-word-slugs";

const config = {
  CLUSTER: "arn:aws:ecs:us-east-1:471112546627:cluster/builder-cluster",
  TASK: "arn:aws:ecs:us-east-1:471112546627:task-definition/builder-task",
};

export const createProject = async (req, res, ecsClient) => {
  const { gitURL, slug } = req.body;
  // console.log(gitURL)

  try {
    //generate unique id
    const projectSlug = slug || generateSlug();

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
        taskRoleArn: "arn:aws:iam::471112546627:role/vercel-clone-task-role",
        containerOverrides: [
          {
            name: "builder-image",
            environment: [
              { name: "GIT_REPOSITORY_URL", value: gitURL },
              { name: "PROJECT_ID", value: projectSlug },
            ],
          },
        ],
      },
    });

    const response = await ecsClient.send(command);
    console.log("ECS Task started:", response.tasks?.[0]?.taskArn);

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

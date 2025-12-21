import { PrismaClient } from "@prisma/client";
import { RunTaskCommand, LaunchType } from "@aws-sdk/client-ecs";
import { Octokit } from "@octokit/rest";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

//CONFIGS
const config = {
    CLUSTER: "arn:aws:ecs:us-east-1:471112546627:cluster/builder-cluster",
    TASK: "arn:aws:ecs:us-east-1:471112546627:task-definition/builder-task",
};

const s3Client = new S3Client({
    region: "us-east-1"
});

const prisma = new PrismaClient();


// ============================================
// HELPER FUNCTIONS
// ============================================

export const getUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { githubAccessToken: true, githubUsername: true }
    });

    if (!user?.githubAccessToken) {
        throw new Error("GITHUB_NOT_CONNECTED");
    }

    return user;
};


export const parseGitHubUrl = (gitURL) => {
    const repoMatch = gitURL.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!repoMatch) {
        throw new Error("INVALID_GITHUB_URL");
    }
    return { owner: repoMatch[1], repoName: repoMatch[2] };
};


// github read write permission access
export const verifyRepoAccess = async (githubToken, owner, repoName) => {
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

export const checkProjectExists = async (userId, gitURL) => {
    return await prisma.project.findFirst({
        where: { userId, gitURL }
    });
};

export const checkSlugAvailable = async (slug) => {
    const existing = await prisma.project.findFirst({
        where: { subDomain: slug }
    });
    return !existing;
};

export const createECSTask = async (ecsClient, project, deployment, envVariables, githubToken, branch = "main") => {
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
export const deleteS3ProjectFiles = async (subDomain) => {
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

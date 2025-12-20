const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
require("dotenv").config();
const { Kafka } = require('kafkajs');

const s3Client = new S3Client({
  region: "us-east-1"
});

const SUB_DOMAIN = process.env.SUB_DOMAIN;
const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const ROOT_DIRECTORY = process.env.ROOT_DIRECTORY || "";
const ENV_VARIABLES = JSON.parse(process.env.ENV_VARIABLES || "{}");

// ✅ NEW: GitHub token for cloning private repos
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIT_REPOSITORY_URL = process.env.GIT_REPOSITORY_URL;
const BRANCH = process.env.BRANCH || "main"; // Support specific branches

const kafka = new Kafka({
  clientId: `docker-build-server-${DEPLOYMENT_ID}`,
  brokers: [process.env.KAFKA_URL],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
  },
  sasl: {
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
    mechanism: 'plain'
  },
  connectionTimeout: 30000,  // Increase timeout this was causing error again !********* 
  requestTimeout: 30000
});

const producer = kafka.producer();

async function publishLog(log) {
  await producer.send({
    topic: 'container-logs',
    messages: [{
      key: 'log',
      value: JSON.stringify({
        PROJECT_ID,
        DEPLOYMENT_ID,
        log
      })
    }]
  });
}

async function updateDeploymentStatus(status) {
  await producer.send({
    topic: 'deployment-status',
    messages: [{
      key: `status-${DEPLOYMENT_ID}`,
      value: JSON.stringify({
        DEPLOYMENT_ID,
        status,
        timestamp: new Date().toISOString()
      })
    }]
  });
}

function detectOutputFolder(projectPath) {
  const possibleFolders = ["build", "dist", "out", ".next", "public"];

  for (const folder of possibleFolders) {
    const folderPath = path.join(projectPath, folder);
    if (fs.existsSync(folderPath)) {
      console.log(`✅ Detected output folder: ${folder}`);
      return folder;
    }
  }

  throw new Error("❌ No output folder found (build/dist/out)");
}

// ✅ NEW: Build authenticated Git URL
function buildAuthenticatedGitURL(url, token) {
  if (!token) {
    console.log("⚠️ No GitHub token provided, using public URL");
    return url;
  }

  // Parse GitHub URL
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) {
    console.log("⚠️ Invalid GitHub URL format");
    return url;
  }

  const [, owner, repo] = match;

  // Build authenticated URL: https://TOKEN@github.com/owner/repo.git
  const authURL = `https://${token}@github.com/${owner}/${repo}.git`;
  console.log(`✅ Built authenticated URL for ${owner}/${repo}`);

  return authURL;
}

//clone in output dir
async function cloneRepository() {
  const outDirPath = path.join(__dirname, "output");

  // Build authenticated URL
  const cloneURL = buildAuthenticatedGitURL(GIT_REPOSITORY_URL, GITHUB_TOKEN);

  console.log(`📥 Cloning repository...`);
  await publishLog(`Cloning repository: ${GIT_REPOSITORY_URL}`);

  // Clone with authentication
  const cloneCommand = BRANCH
    ? `git clone --branch ${BRANCH} --single-branch ${cloneURL} ${outDirPath}`
    : `git clone ${cloneURL} ${outDirPath}`;

  return new Promise((resolve, reject) => {
    exec(cloneCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Clone failed:", error.message);

        // Don't expose token in logs
        const sanitizedError = error.message.replace(GITHUB_TOKEN, '***TOKEN***');
        publishLog(`Clone failed: ${sanitizedError}`);

        reject(error);
        return;
      }

      console.log("✅ Repository cloned successfully");
      publishLog("Repository cloned successfully");
      resolve();
    });
  });
}

async function init() {
  await producer.connect();

  console.log("Executing script.js");
  await publishLog("Build Started....");

  try {
    await updateDeploymentStatus("IN_PROGRESS");

    // ✅ STEP 1: Clone repository with authentication
    await cloneRepository();

    // ✅ STEP 2: Determine project path
    const outDirPath = path.join(__dirname, "output");
    const projectPath = ROOT_DIRECTORY
      ? path.join(outDirPath, ROOT_DIRECTORY)
      : outDirPath;

    console.log(`📁 Project path: ${projectPath}`);
    await publishLog(`Using directory: ${ROOT_DIRECTORY || "root"}`);

    // ✅ STEP 3: Write .env file if needed
    if (Object.keys(ENV_VARIABLES).length > 0) {
      const envContent = Object.entries(ENV_VARIABLES)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

      fs.writeFileSync(path.join(projectPath, ".env"), envContent);
      console.log("✅ Environment variables written");
      await publishLog("Environment variables configured");
    }

    // ✅ STEP 4: Install and build
    console.log("📦 Installing dependencies...");
    await publishLog("Installing dependencies...");

    const buildProcess = exec(`cd ${projectPath} && npm install && npm run build`);

    buildProcess.stdout.on("data", async function (data) {
      console.log(data.toString());
      await publishLog(data.toString());
    });

    buildProcess.stderr.on("data", async function (data) {
      const text = data.toString();
      const lower = text.toLowerCase();

      if (
        lower.includes("npm warn") ||
        lower.includes("warn") ||
        lower.includes("deprecated") ||
        lower.includes("outdated")
      ) {
        await publishLog(`WARN: ${text}`);
        console.log("Warning:", text);
      } else {
        await publishLog(`ERROR: ${text}`);
        console.error("Build Error:", text);
      }
    });

    buildProcess.on("close", async function (code) {
      if (code !== 0) {
        console.error("❌ Build failed with code:", code);
        await publishLog("Build Failed");
        await updateDeploymentStatus("FAIL");
        process.exit(1);
      }

      console.log("✅ Build complete");
      await publishLog("Build complete");

      // ✅ STEP 5: Detect output folder
      const outputFolder = detectOutputFolder(projectPath);
      const distFolderPath = path.join(projectPath, outputFolder);

      console.log(`📦 Output folder: ${distFolderPath}`);
      await publishLog(`Uploading from: ${outputFolder}`);

      if (!fs.existsSync(distFolderPath)) {
        console.error("❌ Dist folder not found");
        await publishLog("Output folder not found");
        await updateDeploymentStatus("FAIL");
        process.exit(1);
      }

      // ✅ STEP 6: Upload to S3
      const distFolderContents = fs.readdirSync(distFolderPath, {
        recursive: true,
      });

      await publishLog("Starting to upload");

      for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        console.log("Uploading", file);
        await publishLog(`Uploading: ${file}`);

        const relativeKey = path.relative(distFolderPath, filePath);

        const command = new PutObjectCommand({
          Bucket: "next-deploy-outputs5",
          Key: `__outputs/${SUB_DOMAIN}/${relativeKey}`,
          Body: fs.createReadStream(filePath),
          ContentType: mime.lookup(filePath) || "application/octet-stream",
        });

        try {
          await s3Client.send(command);
          console.log("✅ Uploaded:", relativeKey);
        } catch (err) {
          console.error("❌ Failed to upload:", relativeKey, err);
          await publishLog(`Upload failed: ${file}`);
        }
      }

      console.log("✅ All files uploaded");
      await publishLog("Deployment complete");
      await publishLog(`🚀 Deployed at: http://${SUB_DOMAIN}.localhost:8000`);

      await updateDeploymentStatus("READY");

      console.log("Exiting...");
      process.exit(0);
    });

  } catch (err) {
    console.error("❌ Script crashed:", err);

    // Sanitize error to not expose token
    const sanitizedError = err.message.replace(GITHUB_TOKEN, '***TOKEN***');
    await publishLog(`Error: ${sanitizedError}`);

    await updateDeploymentStatus("FAIL");
    process.exit(1);
  }
}

init();
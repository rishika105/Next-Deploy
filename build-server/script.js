const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
require("dotenv").config();
const { Kafka } = require('kafkajs')


const s3Client = new S3Client({
  region: "us-east-1"
});


//from api server the unique slug given by user / custom domain
const SUB_DOMAIN = process.env.SUB_DOMAIN;
const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const ROOT_DIRECTORY = process.env.ROOT_DIRECTORY || "";
const ENV_VARIABLES = JSON.parse(process.env.ENV_VARIABLES || "{}");

//throw logs at kafka
const kafka = new Kafka({
  clientId: `docker-build-server-${DEPLOYMENT_ID}`,
  brokers: [process.env.KAFKA_URL],  //SERVICE URI
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
  },
  sasl: {
    username: 'avnadmin',
    password: 'AVNS_Z2KJholFPlGfRXUZ0mP',
    mechanism: 'plain'
  }
})

const producer = kafka.producer()

//publish logs using kafka
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
  })
}

//send status update to kafka
async function updateDeploymentStatus(status) {
  // console.log(`📊 Updating deployment status to: ${status}`);
  await producer.send({
    topic: 'deployment-status', // NEW TOPIC
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


// ✅ AUTO-DETECT OUTPUT FOLDER
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

async function init() {
  //connect kafka producer
  await producer.connect();

  console.log("Executing script.js");
  await publishLog("Build Started....");

  try {
    //check what is root directory
    const outDirPath = path.join(__dirname, "output");
    const projectPath = ROOT_DIRECTORY
      ? path.join(outDirPath, ROOT_DIRECTORY)
      : outDirPath;

    console.log(`📁 Project path: ${projectPath}`);
    await publishLog(`Using directory: ${ROOT_DIRECTORY || "root"}`);

    // ✅ WRITE .env FILE IF ENV VARIABLES PROVIDED
    if (Object.keys(ENV_VARIABLES).length > 0) {
      const envContent = Object.entries(ENV_VARIABLES)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

      fs.writeFileSync(path.join(projectPath, ".env"), envContent);
      console.log("✅ Environment variables written");
      await publishLog("Environment variables configured");
    }

    // ✅ UPDATE STATUS: IN_PROGRESS 
    await updateDeploymentStatus("IN_PROGRESS");

    //build the code and it makes a dist folder
    const p = exec(`cd ${projectPath} && npm install && npm run build`);

    //gives a buffer
    p.stdout.on("data", async function (data) {
      console.log(data.toString());
      await publishLog(data.toString());
    });

    p.stderr.on("data", async function (data) {
      const text = data.toString();

      // Check if it's npm warning or any non-critical warning
      const lower = text.toLowerCase();

      if (
        lower.includes("npm warn") ||
        lower.includes("warn") ||
        lower.includes("deprecated") ||
        lower.includes("outdated")
      ) {
        // publish as warning
        await publishLog(`WARN: ${text}`);
        console.log("Warning:", text);
      } else {
        // real error
        await publishLog(`ERROR: ${text}`);
        console.error("Build Error:", text);
      }
    });


    p.on("close", async function (code) {
      if (code !== 0) {
        console.error("❌ Build failed with code:", code);
        await publishLog("Build Failed");

        // ✅ UPDATE STATUS: FAIL
        await updateDeploymentStatus("FAIL");
        process.exit(1);
      }

      console.log("Build complete");
      await publishLog("Build complete");

      // ✅ DETECT OUTPUT FOLDER
      const outputFolder = detectOutputFolder(projectPath);
      const distFolderPath = path.join(projectPath, outputFolder);

      console.log(`📦 Output folder: ${distFolderPath}`);
      await publishLog(`Uploading from: ${outputFolder}`);

      if (!fs.existsSync(distFolderPath)) {
        console.error("❌ Dist folder not found. Build might have failed.");
        await publishLog("Dist Error");

        // ✅ UPDATE STATUS: FAIL
        await updateDeploymentStatus("FAIL");
        process.exit(1);
      }

      //we need contents of this folder all static html and css
      //we need to store that in s3 give file path and not folder path
      const distFolderContents = fs.readdirSync(distFolderPath, {
        recursive: true,
      });

      await publishLog("Starting to upload");

      //upload all files in S3
      for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        console.log("uploading", filePath);
        await publishLog(`Uploading, ${filePath}`);
        const relativeKey = path.relative(distFolderPath, filePath);

        const command = new PutObjectCommand({
          Bucket: "next-deploy-outputs3",
          Key: `__outputs/${SUB_DOMAIN}/${relativeKey}`,
          Body: fs.createReadStream(filePath),
          ContentType: mime.lookup(filePath) || "application/octet-stream",
        });

        try {
          await s3Client.send(command);
          console.log("uploaded", relativeKey);
          await publishLog(`uploaded ${relativeKey}`);
        }
        catch (err) {
          console.error("❌ Failed to upload:", relativeKey, err);
          await publishLog(`Failed to upload ${err}`);
        }

        console.log("uploaded", filePath);
      }

      p.stderr.on("data", async function (data) {
        console.error("Build Error:", data.toString());
        await publishLog(`Error ${data.toString()}`);
      });

      console.log("Done.......");
      await publishLog("Done........");

      // ✅ UPDATE STATUS: READY (deployment successful)
      await updateDeploymentStatus("READY");

      console.log("Exiting...");
      process.exit(0);
    });
  }

  catch (err) {
    console.error("❌ Script crashed:", err);
    await publishLog(`Error: ${err.message}`);

    // ✅ UPDATE STATUS: FAIL
    await updateDeploymentStatus("FAIL");
    await prisma.$disconnect();
    process.exit(1);
  }
}

init();

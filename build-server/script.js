const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { Kafka } = require('kafkajs')

//using valkey uri
//used to publish logs to redis
const prisma = new PrismaClient();


const s3Client = new S3Client({
  region: "us-east-1"
});


//from api server the unique slug given by user / custom domain
const SUB_DOMAIN = process.env.SUB_DOMAIN;
const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;

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
  await producer.send({ topic: 'container-logs', messages: [{ key: 'log', value: JSON.stringify({ PROJECT_ID, DEPLOYMENT_ID, log }) }] })
}

async function updateDeploymentStatus(status) {
  try {
    await prisma.deployment.update({
      where: { id: DEPLOYMENT_ID },
      data: { status: status }
    });
    console.log(`✅ Deployment status updated to: ${status}`);
  } catch (err) {
    console.error("Failed to update deployment status:", err);
  }
}

async function init() {
  //connect kafka producer
  await producer.connect();

  console.log("Executing script.js");
  publishLog("Build Started....");

  try {
    const outDirPath = path.join(__dirname, "output");

    // ✅ UPDATE STATUS: IN_PROGRESS 
    await updateDeploymentStatus("IN_PROGRESS");

    //build the code and it makes a dist folder
    const p = exec(`cd ${outDirPath} && npm install && npm run build`);

    //gives a buffer
    p.stdout.on("data", async function (data) {
      console.log(data.toString());
      await publishLog(data.toString());
    });

    p.stderr.on("data", async function (data) {
      console.error("Build Error:", data.toString());
      await publishLog(`Error: ${data.toString()}`);
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
      publishLog("Build complete");

      const distFolderPath = path.join(__dirname, "output", "build");

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
          Bucket: "next-deploy-outputs",
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

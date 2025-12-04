const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis");
require("dotenv").config();
const crypto = require("crypto");

const uniqueId = "proj_" + crypto.randomUUID();
//using valkey uri
//used to publish logs to redis
const publisher = new Redis(process.env.VALKEY_URL);

const s3Client = new S3Client({
  region: "us-east-1"
});

const PROJECT_ID = process.env.PROJECT_ID;

function publishLog(log) {
  publisher.publish(`logs:${uniqueId}`, JSON.stringify({ log }));
}

async function init() {
  console.log("Executing script.js");
  publishLog("Build Started....");
  const outDirPath = path.join(__dirname, "output");

  //build the code and it makes a dist folder
  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  //gives a buffer
  p.stdout.on("data", function (data) {
    console.log("Error", data.toString());
    publishLog(data.toString());
  });

  p.on("close", async function () {
    console.log("Build complete");
    publishLog("Build complete");

    const distFolderPath = path.join(__dirname, "output", "build");
    if (!fs.existsSync(distFolderPath)) {
      console.error("❌ Dist folder not found. Build might have failed.");
      publishLog("Dist Error");
      return;
    }
    //we need contents of this folder all static html and css
    //we need to store that in s3 give file path and not folder path
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    publishLog("Starting to upload");

    //upload all files in S3
    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("uploading", filePath);
      publishLog(`Uploading, ${filePath}`);
      const relativeKey = path.relative(distFolderPath, filePath);

      const command = new PutObjectCommand({
        Bucket: "next-deploy-outputs",
        Key: `__outputs/${PROJECT_ID}/${uniqueId}/${relativeKey}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || "application/octet-stream",
      });

      try {
        await s3Client.send(command);
        console.log("uploaded", relativeKey);
        publishLog(`uploaded ${relativeKey}`);
      }
      catch (err) {
        console.error("❌ Failed to upload:", relativeKey, err);
        publishLog(`Failed to upload ${err}`);
      }

      console.log("uploaded", filePath);
    }

    p.stderr.on("data", function (data) {
      console.error("Build Error:", data.toString());
      publishLog(`Error ${data.toString()}`);
    });

    console.log("Done.......");
    publishLog("Done........");

    console.log("Exiting...");
    process.exit(0);

  });
}

init().catch((err) => console.error("❌ Script crashed:", err));

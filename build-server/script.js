const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
require("dotenv").config();

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
  console.log("Executing script.js");
  const outDirPath = path.join(__dirname, "output");

  //build the code and it makes a dist folder
  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  //gives a buffer
  p.stdout.on("data", function (data) {
    console.log("Error", data.toString());
  });

  p.on("close", async function () {
    console.log("Build complete");

    const distFolderPath = path.join(__dirname, "output", "build");
    if (!fs.existsSync(distFolderPath)) {
      console.error("❌ Dist folder not found. Build might have failed.");
      return;
    }
    //we need contents of this folder all static html and css
    //we need to store that in s3 give file path and not folder path
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("uploading", filePath);

      const relativeKey = path.relative(distFolderPath, filePath);
      const command = new PutObjectCommand({
        Bucket: "vercel-clone-outputs5",
        Key: `__outputs/${PROJECT_ID}/${relativeKey}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || "application/octet-stream",
      });

      try {
        await s3Client.send(command);
        console.log("uploaded", relativeKey);
      } catch (err) {
        console.error("❌ Failed to upload:", relativeKey, err);
      }

      console.log("uploaded", filePath);
    }

    p.stderr.on("data", function (data) {
      console.error("Build Error:", data.toString());
    });

    console.log("Done.......");
  });
}

init().catch(err => console.error("❌ Script crashed:", err));
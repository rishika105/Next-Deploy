const { exec } = require("child_process");
const path = require("path");
const fs = require("fs")

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
    const distFolderPath = path.join(__dirname, 'output', 'dist')
    //we need contents of this folder all static html and css
    //we need to store that in s3 give file path and not folder path
    const distFolderContents = fs.readdirSync(distFolderPath, {recursive: true})

    for(const filePath of distFolderContents){
        if(fs.lstatSync(filePath).isDirectory()) continue;

        
    }
  });
}

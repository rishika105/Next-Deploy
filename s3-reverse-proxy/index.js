const express = require("express");
const httpProxy = require("http-proxy");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

const BASE_PATH =
  "https://next-deploy-outputs2.s3.us-east-1.amazonaws.com/__outputs";

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostName = req.hostname;
  const subdomain = hostName.split(".")[0];

  // Handle root path
  // route handled differently
  //to serve index.html
  //on basis of subdomain the path resolved to find the s3 path
  //https://next-deploy-outputs2.s3.us-east-1.amazonaws.com/__outputs/subdomain
  let targetPath = req.url === "/" ? "/index.html" : req.url;
  const resolvesTo = `${BASE_PATH}/${subdomain}${targetPath}`;

  //check web analytics whoever request to proxy record it

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true, ignorePath: true });
});



app.listen(PORT, () => console.log(`Reverse proxy running...${PORT}`));

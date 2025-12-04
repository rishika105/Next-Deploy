const express = require("express");
const httpProxy = require("http-proxy");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

const BASE_PATH =
  "https://next-deploy-outputs.s3.us-east-1.amazonaws.com/__outputs";

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostName = req.hostname;
  const subdomain = hostName.split(".")[0];

  const resolvesTo = `${BASE_PATH}/${subdomain}`;

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

//if request on / route handled differently
//to serve index.html
proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") {
    proxyReq.path += "index.html";
  }
  return proxyReq;
});

app.listen(PORT, () => console.log(`Reverse proxy running...${PORT}`));

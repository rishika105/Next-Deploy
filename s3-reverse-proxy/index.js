const express = require("express");
const httpProxy = require("http-proxy");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

const BASE_PATH =
  "https://vercel-clone-outputs5.s3.ap-south-1.amazonaws.com/__outputs";

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostName = req.hostname;
  const subdomain = hostName.split(".")[0];

  const resolvesTo = `${BASE_PATH}/${subdomain}`;

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on("proxyReq", (proxyReq, req, res, options) => {
  if (req.url === "/") {
    proxyReq.path = "/index.html"; // overwrite, don't append
  }
});


app.listen(PORT, () => console.log(`Reverse proxy running...${PORT}`));

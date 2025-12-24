// reverse-proxy/server.js
const express = require("express");
const httpProxy = require("http-proxy");
const { PrismaClient } = require("@prisma/client");
const geoip = require("geoip-lite");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;
const BASE_PATH = "https://next-deploy-outputs5.s3.us-east-1.amazonaws.com/__outputs";

const proxy = httpProxy.createProxy();
const prisma = new PrismaClient();

// ✅ ANALYTICS MIDDLEWARE
app.use(async (req, res, next) => {
  const startTime = Date.now();
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];
  
  // Get user info
  const userIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                 req.socket.remoteAddress || 
                 'unknown';
  const userAgent = req.headers['user-agent'] || null;
  const referer = req.headers['referer'] || null;
  
  // Get location from IP
  const geo = geoip.lookup(userIp === '::1' || userIp === '127.0.0.1' ? '8.8.8.8' : userIp);
  const country = geo?.country || "Unknown";
  const city = geo?.city || "Unknown";
  
  // Wait for response to complete
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // ✅ STORE ANALYTICS IN DATABASE
    try {
      await prisma.analytics.create({
        data: {
          subdomain,
          path: req.url,
          method: req.method,
          statusCode,
          responseTime,
          userIp,
          userAgent,
          referer,
          country,
          city,
          timestamp: new Date()
        }
      });
      
      console.log(`📊 [${subdomain}] ${req.method} ${req.url} - ${statusCode} (${responseTime}ms) - ${country}`);
    } catch (err) {
      console.error("Analytics error:", err);
    }
  });
  
  next();
});

// ✅ PROXY REQUEST
app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];
  
  let targetPath = req.url === "/" ? "/index.html" : req.url;
  const resolvesTo = `${BASE_PATH}/${subdomain}${targetPath}`;
  
  return proxy.web(req, res, { 
    target: resolvesTo, 
    changeOrigin: true, 
    ignorePath: true 
  });
});

// ✅ HANDLE PROXY ERRORS
proxy.on('error', (err, req, res) => {
  console.error("Proxy error:", err);
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Bad Gateway');
});

// ✅ GRACEFUL SHUTDOWN
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => console.log(`🚀 Reverse proxy running on port ${PORT}`));
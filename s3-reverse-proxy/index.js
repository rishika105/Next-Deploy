// reverse-proxy/server.js (with accurate IP location)
const express = require("express");
const httpProxy = require("http-proxy");
const { PrismaClient } = require("@prisma/client");
const { getAccurateLocation } = require("./ip-location");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;
const BASE_PATH = "https://next-deploy-outputs5.s3.us-east-1.amazonaws.com/__outputs";

const proxy = httpProxy.createProxy();
const prisma = new PrismaClient();

// ✅ STATIC FILE EXTENSIONS TO IGNORE
const STATIC_EXTENSIONS = [
  '.css', '.js', '.jsx', '.ts', '.tsx',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.mp3', '.wav', '.pdf',
  '.map', '.json', '.xml'
];

// ✅ PATHS TO IGNORE (case-insensitive)
const IGNORED_PATHS = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/_next',
  '/static',
  '/assets'
];

// ✅ CHECK IF REQUEST SHOULD BE TRACKED
function shouldTrackRequest(url) {
  const lowerUrl = url.toLowerCase();
  
  if (STATIC_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
    return false;
  }
  
  if (IGNORED_PATHS.some(path => lowerUrl.startsWith(path))) {
    return false;
  }
  
  if (lowerUrl.includes('/assets/') || 
      lowerUrl.includes('/static/') || 
      lowerUrl.includes('/_next/')) {
    return false;
  }
  
  return true;
}

// ✅ GET REAL CLIENT IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  const socketIp = req.socket.remoteAddress;
  
  if (socketIp === '::1' || socketIp === '127.0.0.1' || socketIp === '::ffff:127.0.0.1') {
    return process.env.TEST_IP || socketIp;
  }
  
  return socketIp || 'unknown';
}

// ✅ ANALYTICS MIDDLEWARE
app.use(async (req, res, next) => {
  const startTime = Date.now();
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];
  
  const shouldTrack = shouldTrackRequest(req.url);
  
  if (shouldTrack) {
    const userIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;
    const referer = req.headers['referer'] || null;
    
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      try {
        // ✅ Get accurate location (async)
        const location = await getAccurateLocation(userIp);
        
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
            country: location.country,
            city: location.city,
            timestamp: new Date()
          }
        });
        
        const statusEmoji = statusCode >= 500 ? '🔴' :
                           statusCode >= 400 ? '🟡' :
                           statusCode >= 300 ? '🔵' : '🟢';
        
        console.log(`${statusEmoji} [${subdomain}] ${req.method} ${req.url} - ${statusCode} (${responseTime}ms) - ${location.country}, ${location.city}`);
      } catch (err) {
        console.error("Analytics error:", err);
      }
    });
  }
  
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
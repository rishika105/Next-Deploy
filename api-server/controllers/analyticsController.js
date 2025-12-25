import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/async-handler.js";

const prisma = new PrismaClient();

/* ===========================
   GET ANALYTICS OF A PROJECT
=========================== */
export const getAnalytics = asyncHandler(async (req, res) => {

    const { subdomain } = req.params;
    const days = parseInt(req.query.days) || 7;
    const userId = req.auth.userId;

    // Verify user owns this subdomain
    const project = await prisma.project.findFirst({
        where: {
            subDomain: subdomain,
            userId: userId
        }
    });

    if (!project) {
        return res.status(403).json({ error: "Unauthorized access to this project" });
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all analytics data for this subdomain
    const analytics = await prisma.analytics.findMany({
        where: {
            subdomain,
            timestamp: {
                gte: startDate
            }
        },
        orderBy: {
            timestamp: 'desc'
        }
    });

    // Calculate metrics
    const totalRequests = analytics.length;
    const uniqueVisitors = new Set(analytics.map(a => a.userIp)).size;
    const avgResponseTime = analytics.length > 0
        ? Math.round(analytics.reduce((sum, a) => sum + a.responseTime, 0) / analytics.length)
        : 0;

    // Group by day
    const requestsByDay = {};
    analytics.forEach(item => {
        const date = new Date(item.timestamp).toISOString().split('T')[0];
        requestsByDay[date] = (requestsByDay[date] || 0) + 1;
    });

    const requestsByDayArray = Object.entries(requestsByDay)
        .map(([date, requests]) => ({ date, requests }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Top countries
    const countryCount = {};
    analytics.forEach(item => {
        countryCount[item.country] = (countryCount[item.country] || 0) + 1;
    });

    const topCountries = Object.entries(countryCount)
        .map(([country, visits]) => ({ country, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);

    // Top pages
    const pageCount = {};
    analytics.forEach(item => {
        pageCount[item.path] = (pageCount[item.path] || 0) + 1;
    });

    const topPages = Object.entries(pageCount)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    // ✅ ERROR PAGES (404, 500, etc.)
    const errorPages = analytics
        .filter(a => a.statusCode >= 400)
        .reduce((acc, item) => {
            const key = `${item.path}`;
            acc[key] = acc[key] || { path: item.path, statusCode: item.statusCode, count: 0 };
            acc[key].count++;
            return acc;
        }, {});

    const topErrors = Object.values(errorPages)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // ✅ SUSPICIOUS ACTIVITY (potential hack attempts)
    const suspiciousPatterns = [
        '/admin', '/wp-admin', '/wp-login', '/phpmyadmin',
        '/administrator', '/.env', '/config', '/backup',
        '/shell', '/cmd', '/exec', '/.git'
    ];

    const suspiciousRequests = analytics
        .filter(a => {
            const lowerPath = a.path.toLowerCase();
            return suspiciousPatterns.some(pattern => lowerPath.includes(pattern));
        })
        .map(a => ({
            path: a.path,
            ip: a.userIp,
            country: a.country,
            timestamp: a.timestamp,
            statusCode: a.statusCode
        }))
        .slice(0, 20);

    // Calculate growth (compare with previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const previousAnalytics = await prisma.analytics.count({
        where: {
            subdomain,
            timestamp: {
                gte: previousStartDate,
                lt: startDate
            }
        }
    });

    const growth = previousAnalytics > 0
        ? ((totalRequests - previousAnalytics) / previousAnalytics * 100).toFixed(1)
        : 0;

    res.json({
        totalRequests,
        uniqueVisitors,
        avgResponseTime,
        growth: parseFloat(growth),
        requestsByDay: requestsByDayArray,
        topCountries,
        topPages,
        topErrors,
        suspiciousRequests
    });
});


/* ===========================
   GET REAL-TIME ANALYTICS 
=========================== */
export const getRealTimeAnalytics = asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    const userId = req.auth.userId;

    // Verify user owns this subdomain
    const project = await prisma.project.findFirst({
        where: {
            subDomain: subdomain,
            userId: userId
        }
    });

    if (!project) {
        return res.status(403).json({ error: "Unauthorized access to this project" });
    }

    // Last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentRequests = await prisma.analytics.findMany({
        where: {
            subdomain,
            timestamp: {
                gte: fiveMinutesAgo
            }
        },
        orderBy: {
            timestamp: 'desc'
        },
        take: 50
    });

    // Count active visitors (unique IPs in last 5 min)
    const activeVisitors = new Set(recentRequests.map(r => r.userIp)).size;

    res.json({
        activeVisitors,
        recentRequests: recentRequests.map(r => ({
            path: r.path,
            country: r.country,
            statusCode: r.statusCode,
            timestamp: r.timestamp
        }))
    });
});

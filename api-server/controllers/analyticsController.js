import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/async-handler.js";

const prisma = new PrismaClient();

/* ===========================
   GET ANALYTICS OF A PROJECT
=========================== */
export const getAnalytics = asyncHandler(async (req, res) => {

    //get analytics stored in by reverse proxy in db
    const { subdomain } = req.params;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));


    const totalRequests = await prisma.analytics.count({
        where: { subdomain, timestamp: { gte: startDate } }
    });

    const uniqueVisitors = await prisma.analytics.groupBy({
        by: ['userIp'],
        where: { subdomain, timestamp: { gte: startDate } }
    });

    const topPages = await prisma.analytics.groupBy({
        by: ['path'],
        where: { subdomain, timestamp: { gte: startDate } },
        _count: true,
        orderBy: { _count: { path: 'desc' } },
        take: 10
    });

    const topCountries = await prisma.analytics.groupBy({
        by: ['country'],
        where: { subdomain, timestamp: { gte: startDate } },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10
    });

    const avgResponseTime = await prisma.analytics.aggregate({
        where: { subdomain, timestamp: { gte: startDate } },
        _avg: { responseTime: true }
    });

    const requestsByDay = await prisma.$queryRaw`
      SELECT 
        DATE("timestamp") as date,
        COUNT(*)::int as requests
      FROM "Analytics"
      WHERE subdomain = ${subdomain}
        AND timestamp >= ${startDate}
      GROUP BY DATE("timestamp")
      ORDER BY date ASC
    `;

    return res.json({
        subdomain,
        period: `Last ${days} days`,
        totalRequests,
        uniqueVisitors: uniqueVisitors.length,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        topPages: topPages.map(p => ({ path: p.path, views: p._count })),
        topCountries: topCountries.map(c => ({ country: c.country, visits: c._count })),
        requestsByDay
    });
});

/* ===========================
   GET REAL-TIME ANALYTICS 
=========================== */

export const getRealTimeAnalytics = asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);


    const recentRequests = await prisma.analytics.findMany({
        where: { subdomain, timestamp: { gte: fiveMinutesAgo } },
        orderBy: { timestamp: 'desc' },
        take: 50
    });

    return res.json({
        subdomain,
        activeVisitors: new Set(recentRequests.map(r => r.userIp)).size,
        recentRequests: recentRequests.map(r => ({
            path: r.path,
            country: r.country,
            timestamp: r.timestamp,
            statusCode: r.statusCode
        }))
    });
});

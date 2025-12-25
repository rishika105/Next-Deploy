"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Users,
  Clock,
  TrendingUp,
  Globe,
  Eye,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import Footer from "@/components/Footer";

const API_URL = "http://localhost:9000/api";

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

export default function AnalyticsPage() {
  const { id: projectId } = useParams();
  const { getToken } = useAuth();

  const [project, setProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (project) {
      fetchAnalytics();
      fetchRealtime();
    }
  }, [project, selectedPeriod]);

  useEffect(() => {
    if (!autoRefresh || !project) return;

    const interval = setInterval(() => {
      fetchAnalytics();
      fetchRealtime();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, project, selectedPeriod]);

  const fetchProject = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(response.data.project);
    } catch (error) {
      console.error("Failed to fetch project:", error);
    }
  };

  const fetchAnalytics = async () => {
    if (!project) return;

    try {
      const token = await getToken();
      // ✅ Send auth token to protected endpoint
      const response = await axios.get(
        `${API_URL}/analytics/${project.subDomain}?days=${selectedPeriod}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    if (!project) return;

    try {
      const token = await getToken();
      // ✅ Send auth token to protected endpoint
      const response = await axios.get(
        `${API_URL}/analytics/${project.subDomain}/realtime`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRealtimeData(response.data);
    } catch (error) {
      console.error("Failed to fetch realtime data:", error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Link href="/overview" className="text-[#FF9FFC] underline">
            Return to projects
          </Link>
        </div>
      </div>
    );
  }

  const growth = analytics?.growth || 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 w-[90%] mb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Link
              href="/overview"
              className="hover:text-white transition-colors"
            >
              Projects
            </Link>
            <span>→</span>
            <Link
              href={`/project/${projectId}`}
              className="hover:text-white transition-colors"
            >
              {project.name}
            </Link>
            <span>→</span>
            <span className="text-white">Analytics</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold mb-2 text-white text-2xl">
                Analytics Dashboard
              </h1>
              <p className="text-gray-400">
                {project.name} • {project.subDomain}.localhost:8000
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-[#5227FF]"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  autoRefresh
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : "bg-gray-900 border-gray-700 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      autoRefresh ? "bg-green-400 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  {autoRefresh ? "Live" : "Paused"}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Requests */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  growth >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {growth >= 0 ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {Math.abs(growth)}%
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {formatNumber(analytics?.totalRequests || 0)}
            </h3>
            <p className="text-gray-400 text-sm">Total Requests</p>
          </div>

          {/* Unique Visitors */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {formatNumber(analytics?.uniqueVisitors || 0)}
            </h3>
            <p className="text-gray-400 text-sm">Unique Visitors</p>
          </div>

          {/* Active Now */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {realtimeData?.activeVisitors || 0}
            </h3>
            <p className="text-gray-400 text-sm">Active Now</p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {analytics?.avgResponseTime || 0}ms
            </h3>
            <p className="text-gray-400 text-sm">Avg Response Time</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Traffic Over Time */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#FF9FFC]" />
              Traffic Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.requestsByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: "#9CA3AF" }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Countries */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#FF9FFC]" />
              Top Countries
            </h3>
            {(analytics?.topCountries || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.topCountries || []}
                    dataKey="visits"
                    nameKey="country"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.country}: ${entry.visits}`}
                  >
                    {(analytics?.topCountries || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pages */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Top Pages</h3>
            <div className="space-y-3">
              {(analytics?.topPages || []).slice(0, 10).map((page, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-gray-500 font-mono text-sm">
                      {index + 1}
                    </span>
                    <span className="text-white truncate font-mono text-sm">
                      {page.path}
                    </span>
                  </div>
                  <span className="text-[#FF9FFC] font-semibold">
                    {formatNumber(page.views)}
                  </span>
                </div>
              ))}
              {(analytics?.topPages || []).length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Recent Visitors */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              Recent Visitors (Last 5 min)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(realtimeData?.recentRequests || []).map((request, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate font-mono text-sm mb-1">
                      {request.path}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{request.country}</span>
                      <span>•</span>
                      <span>
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      request.statusCode >= 200 && request.statusCode < 300
                        ? "bg-green-500/20 text-green-400"
                        : request.statusCode >= 400
                        ? "bg-red-500/20 text-red-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {request.statusCode}
                  </span>
                </div>
              ))}
              {(realtimeData?.recentRequests || []).length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No recent visitors
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Security & Errors Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Error Pages (404, 500, etc.) */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Error Pages
            </h3>
            <div className="space-y-3">
              {(analytics?.topErrors || []).map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        error.statusCode >= 500
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {error.statusCode}
                    </span>
                    <span className="text-white truncate font-mono text-sm">
                      {error.path}
                    </span>
                  </div>
                  <span className="text-red-400 font-semibold">
                    {formatNumber(error.count)}
                  </span>
                </div>
              ))}
              {(analytics?.topErrors || []).length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No errors recorded 🎉
                </p>
              )}
            </div>
          </div>

          {/* Suspicious Activity */}
          <div className="bg-gray-900/50 border border-red-900/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Suspicious Activity
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(analytics?.suspiciousRequests || []).map((request, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate font-mono text-sm mb-1">
                      {request.path}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="text-yellow-400">{request.ip}</span>
                      <span>•</span>
                      <span>{request.country}</span>
                      <span>•</span>
                      <span>
                        {new Date(request.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      request.statusCode >= 400
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {request.statusCode}
                  </span>
                </div>
              ))}
              {(analytics?.suspiciousRequests || []).length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No suspicious activity detected ✅
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
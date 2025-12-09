"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import axios from "axios";
import { fetchAllDeployments } from "@/services/deployService";

export default function AllDeployments() {
  const { getToken } = useAuth();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDeployments = async () => {
    const token = await getToken();
    try {
      setLoading(true);
      const data = await fetchAllDeployments(token);
      setDeployments(data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "READY":
        return "bg-green-500/20 text-green-400";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400";
      case "FAIL":
        return "bg-red-500/20 text-red-400";
      case "QUEUED":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-2">
            <span className="bg-gradient-to-r text-gray-100 bg-clip-text">
              All Deployments
            </span>
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading deployments...</p>
            </div>
          </div>
        ) : deployments.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-2xl">
            <h3 className="text-2xl font-bold mb-3">No deployments yet</h3>
            <p className="text-gray-400 mb-6">
              Deploy your first project to see it here.
            </p>
            <Link
              href="/deploy"
              className="inline-flex items-center space-x-2 border border-[#574d81] px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <span>Deploy First Project</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">
                      Project
                    </th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">
                      Deployed
                    </th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((deployment) => (
                    <tr
                      key={deployment.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/20"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium">
                            {deployment.project?.name || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-400">
                            {deployment.id.substring(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(
                            deployment.status
                          )}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full mr-2 ${
                              deployment.status === "IN_PROGRESS"
                                ? "animate-pulse"
                                : ""
                            } ${
                              deployment.status === "READY"
                                ? "bg-green-400"
                                : deployment.status === "IN_PROGRESS"
                                ? "bg-blue-400"
                                : deployment.status === "FAIL"
                                ? "bg-red-400"
                                : "bg-gray-400"
                            }`}
                          ></span>
                          {deployment.status}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-gray-300">
                          {new Date(deployment.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(deployment.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/logs/${deployment.id}`}
                            className="px-3 py-1 bg-[#5227FF]/20 hover:bg-[#5227FF]/30 text-[#FF9FFC] rounded-lg text-sm transition-colors"
                          >
                            Logs
                          </Link>
                          <Link
                            href={`/project/${deployment.projectId}`}
                            className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-lg text-sm transition-colors"
                          >
                            Project
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

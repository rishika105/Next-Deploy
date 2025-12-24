"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllDeployments } from "@/services/deployService";
import Footer from "../../components/Footer";
import { useRouter } from "next/navigation";
import { GitBranch, User, Clock } from "lucide-react";

export default function AllDeployments() {
  const { getToken } = useAuth();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDeployments = async () => {
    const token = await getToken();
    try {
      setLoading(true);
      const response = await getAllDeployments(token);
      setDeployments(response.deployments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleCard = (deploymentId) => {
    router.push(`/deployments/${deploymentId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "READY":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "FAIL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "QUEUED":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8 w-[90%] mb-28">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">
              <span className="bg-gradient-to-r text-gray-100 bg-clip-text">
                All Deployments
              </span>
            </h1>
            <p className="text-gray-400">
              View and manage all your deployments
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading deployments...</p>
              </div>
            </div>
          ) : deployments?.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">No deployments yet</h3>
              <p className="text-gray-400 mb-6">
                Deploy your first project to see it here.
              </p>
              <Link
                href="/deploy"
                className="inline-flex items-center space-x-2 bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-transform"
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
                    <tr className="border-b border-gray-800 bg-gray-900/50">
                      <th className="text-left py-4 px-6 text-gray-400 font-medium">
                        Project
                      </th>
                      <th className="text-left py-4 px-6 text-gray-400 font-medium">
                        Commit
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
                    {deployments?.map((deployment) => (
                      <tr
                        key={deployment.id}
                        onClick={() => handleCard(deployment.id)}
                        className="border-b border-gray-800/50 hover:bg-gray-800/20 cursor-pointer transition-colors"
                      >
                        {/* Project Info */}
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-white">
                              {deployment.project?.name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-400 font-mono">
                              {deployment.id.substring(0, 8)}...
                            </p>
                          </div>
                        </td>

                        {/* ✅ Commit Info */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            {deployment.commitMessage ? (
                              <>
                                <p className="text-sm text-gray-300 truncate max-w-xs">
                                  {deployment.commitMessage}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {deployment.commitHash && (
                                    <span className="flex items-center gap-1 font-mono">
                                      <GitBranch className="w-3 h-3" />
                                      {deployment.commitHash}
                                    </span>
                                  )}
                                  {deployment.commitAuthor && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {deployment.commitAuthor}
                                    </span>
                                  )}
                                </div>
                                {deployment.branch && (
                                  <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                    {deployment.branch}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">
                                Manual deployment
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <div
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getStatusColor(
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
                                  : "bg-yellow-400"
                              }`}
                            />
                            {deployment.status}
                          </div>
                        </td>

                        {/* Deployed Date */}
                        <td className="py-4 px-6">
                          <p className="text-gray-300 text-sm">
                            {new Date(
                              deployment.createdAt
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(deployment.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Link
                              onClick={(e) => e.stopPropagation()}
                              href={`/project/${deployment.projectId}`}
                              className="px-3 py-1 bg-[#5227FF]/20 hover:bg-[#5227FF]/30 text-[#FF9FFC] rounded-lg text-sm transition-colors"
                            >
                              Project
                            </Link>
                            {deployment.status === "READY" &&
                              deployment.url && (
                                <a
                                  onClick={(e) => e.stopPropagation()}
                                  href={deployment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors"
                                >
                                  Visit
                                </a>
                              )}
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
      <Footer />
    </>
  );
}

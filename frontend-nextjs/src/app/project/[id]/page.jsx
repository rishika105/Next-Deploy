"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import {
  getProjectDeployments,
  getProjectDetails,
} from "@/services/projectService";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploymentsLoading, setDeploymentsLoading] = useState(true);

  //api calls
  useEffect(() => {
    fetchProjectDetails();
    fetchProjectDeployments();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const token = await getToken();
      const response = await getProjectDetails(id, token);
      setProject(response.project);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDeployments = async () => {
    try {
      const token = await getToken();
      const response = await getProjectDeployments(id, token);
      setDeployments(response.deployments);
    } finally {
      setDeploymentsLoading(false);
    }
  };

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const latestDeployment = deployments[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Link href="/overview" className="text-[#FF9FFC] underline">
            Return to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-[90%] mx-auto text-white mb-20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <Link href="/overview" className="hover:text-white">
                Projects
              </Link>
              <span>→</span>
              <span className="text-white">{project.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
                <p className="text-gray-400">
                  {project.framework && (
                    <span className="inline-flex items-center gap-2 bg-gray-800/60 border border-gray-700 px-3 py-1 rounded-full text-sm mr-3">
                      {project.framework}
                    </span>
                  )}
                  Created {formatDate(project.createdAt)}
                </p>
              </div>

              {latestDeployment?.status === "READY" && (
                <a
                  href={`http://${project.subDomain}.localhost:8000`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
                >
                  Visit Site
                </a>
              )}
            </div>
          </div>

          {/* Project Details Card */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-6">Project Details</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Deployment URL</p>
                <a
                  href={`http://${project.subDomain}.localhost:8000`}
                  target="_blank"
                  className="text-[#FF9FFC] hover:underline break-all"
                >
                  http://{project.subDomain}.localhost:8000
                </a>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Latest Status</p>
                {latestDeployment ? (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(
                      latestDeployment.status
                    )}`}
                  >
                    {latestDeployment.status}
                  </span>
                ) : (
                  <span className="text-gray-500">No deployments</span>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Git Repository</p>
                <a
                  href={project.gitURL}
                  target="_blank"
                  className="text-blue-400 hover:underline break-all flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.758-1.333-1.758-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.998.108-.775.42-1.305.763-1.604-2.665-.303-5.466-1.334-5.466-5.932 0-1.31.469-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.48 11.48 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.292-1.553 3.298-1.23 3.298-1.23.655 1.653.243 2.873.12 3.176.77.84 1.234 1.912 1.234 3.222 0 4.61-2.805 5.625-5.475 5.922.431.37.814 1.103.814 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.302 24 12 24 5.372 18.628 0 12 0z"
                    />
                  </svg>
                  {project.gitURL.split("/").slice(-2).join("/")}
                </a>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Subdomain</p>
                <p className="text-white font-mono">{project.subDomain}</p>
              </div>

              {project.rootDirectory && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Root Directory</p>
                  <p className="text-white font-mono">
                    {project.rootDirectory}
                  </p>
                </div>
              )}

              {project.envVariables &&
                Object.keys(project.envVariables).length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-400 mb-2">
                      Environment Variables
                    </p>
                    <div className="bg-black/30 rounded-lg p-4 font-mono text-sm">
                      {Object.entries(project.envVariables).map(
                        ([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="text-blue-400">{key}</span>
                            <span className="text-gray-500">=</span>
                            <span className="text-green-400">{value}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Deployments Section */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Deployments</h2>
              <span className="text-sm text-gray-400">
                {deployments.length} total
              </span>
            </div>

            {deploymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No deployments yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-6 py-3 text-sm text-gray-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-sm text-gray-400">
                        Deployment ID
                      </th>
                      <th className="px-6 py-3 text-sm text-gray-400">
                        Created
                      </th>
                      <th className="px-6 py-3 text-sm text-gray-400">
                        Updated
                      </th>
                      <th className="px-6 py-3 text-sm text-gray-400">
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
                        <td className="px-6 py-4">
                          <span
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
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-300">
                          {deployment.id.substring(0, 12)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {formatDate(deployment.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {formatDate(deployment.updatedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/deployments/${deployment.id}`}
                            className="px-3 py-1 bg-[#5227FF]/20 hover:bg-[#5227FF]/30 text-[#FF9FFC] rounded-lg text-sm transition-colors"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

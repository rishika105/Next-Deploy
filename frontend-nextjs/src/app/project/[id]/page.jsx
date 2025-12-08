"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiService } from "@/lib/api-service";
import { showToast } from "@/lib/toast-service";
import { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function ProjectDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiService, setApiService] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    name: "",
    rootDirectory: "",
    envVariables: [],
  });

  useEffect(() => {
    if (getToken) {
      setApiService(new ApiService(getToken));
    }
  }, [getToken]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const [projectData, deploymentsData] = await Promise.all([
        apiService.getProjectById(id),
        apiService.getDeploymentsByProject(id),
      ]);
      setProject(projectData);
      setDeployments(deploymentsData);

      // Set form data
      setUpdateForm({
        name: projectData.name,
        rootDirectory: projectData.rootDirectory || "",
        envVariables: Object.entries(projectData.envVariables || {}).map(
          ([key, value]) => ({ key, value })
        ),
      });
    } catch (error) {
      console.error("Failed to fetch project details:", error);
      showToast.error("Failed to load project details");
      router.push("/overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiService && id) {
      fetchProjectDetails();
    }
  }, [apiService, id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const toastId = showToast.loading("Updating project...");

    try {
      const envObject = updateForm.envVariables.reduce((acc, env) => {
        if (env.key && env.value) {
          acc[env.key] = env.value;
        }
        return acc;
      }, {});

      await apiService.updateProject(id, {
        name: updateForm.name,
        rootDirectory: updateForm.rootDirectory,
        envVariables: envObject,
      });

      showToast.dismiss(toastId);
      showToast.success("Project updated successfully");
      setShowUpdateModal(false);
      fetchProjectDetails();
    } catch (error) {
      showToast.dismiss(toastId);
      showToast.error(
        error.response?.data?.error || "Failed to update project"
      );
    }
  };

  const handleRedeploy = async () => {
    if (!confirm("Redeploy this project with current settings?")) return;

    const toastId = showToast.loading("Redeploying project...");

    try {
      const result = await apiService.redeployProject(id);
      showToast.dismiss(toastId);
      showToast.success("Redeployment started successfully");
      router.push(`/logs/${result.deploymentId}`);
    } catch (error) {
      showToast.dismiss(toastId);
      showToast.error(
        error.response?.data?.error || "Failed to redeploy project"
      );
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    )
      return;

    const toastId = showToast.loading("Deleting project...");

    try {
      await apiService.deleteProject(id);
      showToast.dismiss(toastId);
      showToast.success("Project deleted successfully");
      router.push("/overview");
    } catch (error) {
      showToast.dismiss(toastId);
      showToast.error(
        error.response?.data?.error || "Failed to delete project"
      );
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-[#FF9FFC] to-[#5227FF] bg-clip-text text-transparent">
                {project.name}
              </span>
            </h1>
            <p className="text-gray-400">
              {project.gitURL} • {project.framework}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRedeploy}
              className="bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              🔄 Redeploy
            </button>
            <button
              onClick={() => setShowUpdateModal(true)}
              className="border border-[#5227FF] text-[#FF9FFC] hover:bg-[#5227FF]/10 px-4 py-2 rounded-lg transition-colors"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Project Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details Card */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6">Project Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Subdomain</p>
                  <p className="font-mono text-[#FF9FFC]">
                    {project.subDomain}.localhost:8000
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Framework</p>
                  <p className="font-medium">{project.framework}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Root Directory</p>
                  <p className="font-medium">{project.rootDirectory || "/"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created</p>
                  <p className="font-medium">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">
                    Environment Variables
                  </p>
                  <div className="bg-gray-900/50 rounded-lg p-4 mt-2">
                    {Object.entries(project.envVariables || {}).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(project.envVariables).map(
                          ([key, value]) => (
                            <div key={key} className="flex items-center">
                              <span className="text-[#FF9FFC] mr-2">{key}</span>
                              <span className="text-gray-300">= {value}</span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No environment variables set
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Deployments History */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Deployment History</h3>
                <span className="text-sm text-gray-400">
                  {deployments.length} deployments
                </span>
              </div>

              {deployments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No deployments yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deployments.map((deployment) => (
                    <Link
                      key={deployment.id}
                      href={`/logs/${deployment.id}`}
                      className="block bg-gray-900/50 hover:bg-gray-800/50 border border-gray-700 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <div
                              className={`px-3 py-1 rounded-full text-xs ${getStatusColor(
                                deployment.status
                              )}`}
                            >
                              {deployment.status}
                            </div>
                            <span className="text-sm text-gray-400">
                              {new Date(deployment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-mono text-gray-300">
                            ID: {deployment.id.substring(0, 8)}...
                          </p>
                        </div>
                        <span className="text-[#5227FF]">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleRedeploy}
                  className="w-full bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] text-white py-3 rounded-lg transition-all transform hover:scale-105"
                >
                  🔄 Redeploy Now
                </button>
                <Link
                  href={`/deploy?clone=${project.id}`}
                  className="block w-full border border-[#5227FF] text-[#FF9FFC] hover:bg-[#5227FF]/10 py-3 rounded-lg text-center transition-colors"
                >
                  🧬 Clone Project
                </Link>
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="w-full border border-gray-700 hover:bg-gray-800/50 text-gray-300 py-3 rounded-lg transition-colors"
                >
                  ⚙️ Edit Settings
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3 rounded-lg transition-colors"
                >
                  🗑️ Delete Project
                </button>
              </div>
            </div>

            {/* Live URL */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Live URL</h3>
              <a
                href={`http://${project.subDomain}.localhost:8000`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-black/50 border border-[#5227FF] rounded-lg p-4 hover:bg-[#5227FF]/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[#FF9FFC] truncate">
                    http://{project.subDomain}.localhost:8000
                  </div>
                  <span className="text-[#5227FF]">↗</span>
                </div>
              </a>
              <p className="text-sm text-gray-400 mt-3">
                Your project is live at this URL
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Update Project Settings</h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={updateForm.name}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#FF9FFC] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Root Directory
                </label>
                <input
                  type="text"
                  value={updateForm.rootDirectory}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      rootDirectory: e.target.value,
                    })
                  }
                  placeholder="/"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#FF9FFC] outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

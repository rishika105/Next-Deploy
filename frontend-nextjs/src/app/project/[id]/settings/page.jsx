"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import Footer from "@/app/components/Footer";
import axios from "axios";
import { getProjectDetails } from "@/services/projectService";

const API_URL = "http://localhost:9000/api";

export default function ProjectSettingsPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable env variables
  const [envVariables, setEnvVariables] = useState({});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  //api calls
  useEffect(() => {
    fetchProjectDetails();
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

  const addEnvVariable = () => {
    if (!newEnvKey.trim() || !newEnvValue.trim()) {
      toast.error("Both key and value are required");
      return;
    }

    if (envVariables[newEnvKey]) {
      toast.error("Variable already exists");
      return;
    }

    setEnvVariables((prev) => ({
      ...prev,
      [newEnvKey]: newEnvValue,
    }));

    setNewEnvKey("");
    setNewEnvValue("");
    // toast.success("Variable added (not saved yet)");
  };

  const removeEnvVariable = (key) => {
    const newVars = { ...envVariables };
    delete newVars[key];
    setEnvVariables(newVars);
  };

  const handleSaveAndRedeploy = async () => {
    setRedeploying(true);
    try {
      const token = await getToken();
      // Save changes
      // Trigger redeploy
      const redeployResponse = await axios.post(
        `${API_URL}/project/${id}/redeploy`,
        { envVariables },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Redeploying with new environment variables...");

      // Redirect to deployment logs
      setTimeout(() => {
        router.push(`/deployment/${redeployResponse.data.deploymentId}`);
      }, 1500);
    } catch (error) {
      console.error("Redeploy error:", error);
      toast.error("Failed to redeploy");
    } finally {
      setRedeploying(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/project/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Project deleted successfully");

      setTimeout(() => {
        router.push("/overview");
      }, 1500);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete project");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
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
              <Link href={`/project/${id}`} className="hover:text-white">
                {project.name}
              </Link>
              <span>→</span>
              <span className="text-white">Settings</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Project Settings</h1>
                <p className="text-gray-400">
                  Manage environment variables and project configuration
                </p>
              </div>

              <Link
                href={`/project/${id}`}
                className="px-6 py-3 border border-gray-700 hover:bg-gray-800/50 rounded-xl font-semibold transition-all"
              >
                ← Back to Project
              </Link>
            </div>
          </div>

          <div className="max-w-4xl space-y-6">
            {/* Project Information (Read-only) */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6">Project Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    disabled
                    className="w-full bg-gray-800/30 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Git Repository URL
                  </label>
                  <input
                    type="text"
                    value={project.gitURL}
                    disabled
                    className="w-full bg-gray-800/30 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Subdomain
                    </label>
                    <input
                      type="text"
                      value={project.subDomain}
                      disabled
                      className="w-full bg-gray-800/30 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Framework
                    </label>
                    <input
                      type="text"
                      value={project.framework}
                      disabled
                      className="w-full bg-gray-800/30 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {project.rootDirectory && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Root Directory
                    </label>
                    <input
                      type="text"
                      value={project.rootDirectory}
                      disabled
                      className="w-full bg-gray-800/30 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Environment Variables (Editable) */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Environment Variables</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Changes require redeployment to take effect
                  </p>
                </div>
                <span className="text-sm text-yellow-400 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Redeploy required
                </span>
              </div>

              {/* Add New Variable */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    placeholder="VARIABLE_NAME"
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5227FF] font-mono text-sm"
                  />
                  <input
                    type="text"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="value"
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#5227FF] font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={addEnvVariable}
                    className="px-6 py-3 bg-[#5227FF]/20 hover:bg-[#5227FF]/30 border border-[#5227FF] rounded-lg transition-colors font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Existing Variables */}
              {Object.keys(envVariables).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(envVariables).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3"
                    >
                      <div className="font-mono text-sm flex-1">
                        <span className="text-blue-400">{key}</span>
                        <span className="text-gray-500 mx-2">=</span>
                        <span className="text-green-400">{value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEnvVariable(key)}
                        className="text-red-400 hover:text-red-300 transition-colors px-3 py-1 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-lg">
                  <p className="text-gray-400">No environment variables set</p>
                </div>
              )}

              {/* Save Actions */}
              <div className="flex gap-4 mt-6 pt-6 border-t border-gray-700 justify-end">
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAndRedeploy}
                    disabled={redeploying}
                    className="flex-1 px-6 py-3 bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {redeploying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        Redeploying...
                      </span>
                    ) : (
                      "Save & Redeploy"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-red-400 mb-4">
                Danger Zone
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium mb-1">Delete this project</p>
                  <p className="text-sm text-gray-400">
                    Once deleted, all deployments and data will be permanently
                    removed.
                  </p>
                </div>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-xl font-semibold transition-all"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Delete Project?</h3>
              <p className="text-gray-400">
                Are you sure you want to delete{" "}
                <strong className="text-white">{project.name}</strong>? This
                action cannot be undone.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Deleting...
                  </span>
                ) : (
                  "Yes, Delete Project"
                )}
              </button>

              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

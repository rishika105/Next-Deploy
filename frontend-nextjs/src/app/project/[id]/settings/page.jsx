"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Footer from "@/components/Footer.jsx";
import {
  getProjectDetails,
  redeployProject,
  deleteProject,
  updateProjectSettings,
} from "@/services/projectService";
import CICDSettings from "@/components/CICDSettings";
import BuildSettings from "@/components/BuildSettings";

export default function ProjectSettingsPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeploying, setRedeploying] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rootDirectory, setRootDirectory] = useState("");
  const [savingRootDir, setSavingRootDir] = useState(false);
  const [isEditingRootDir, setIsEditingRootDir] = useState(false);

  // Editable env variables
  const [envVariables, setEnvVariables] = useState({});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

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
  };

  const removeEnvVariable = (key) => {
    const newVars = { ...envVariables };
    delete newVars[key];
    setEnvVariables(newVars);
  };

  //api calls
  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const token = await getToken();
      const response = await getProjectDetails(id, token);
      setProject(response.project);
      setEnvVariables(response.project.envVariables || {});
      setRootDirectory(response.project.rootDirectory || "/");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRootDirectory = async () => {
    setSavingRootDir(true);
    const toastId = toast.loading("Loading...");
    try {
      const token = await getToken();
      const normalizedRootDir =
        rootDirectory.trim() === "/" ? "" : rootDirectory.trim();

      await updateProjectSettings(
        id,
        { rootDirectory: normalizedRootDir },
        token
      );
      toast.success("Root directory updated successfully");
      setProject((prev) => ({ ...prev, rootDirectory }));
      setIsEditingRootDir(false);
    } finally {
      setSavingRootDir(false);
      toast.dismiss(toastId);
    }
  };

  const handleSaveAndRedeploy = async () => {
    setRedeploying(true);
    try {
      const token = await getToken();
      const redeployResponse = await redeployProject(token, envVariables, id);

      toast.success("Redeploying with new environment variables...");

      setTimeout(() => {
        router.push(`/deployments/${redeployResponse.deploymentId}`);
      }, 1500);
    } finally {
      setRedeploying(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await deleteProject(id, token);

      toast.success("Project deleted successfully");

      setTimeout(() => {
        router.push("/overview");
      }, 1500);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Settings...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Link
            href="/overview"
            className="text-gray-400 underline hover:text-white"
          >
            Return to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8 w-[90%]">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <Link
                href="/overview"
                className="hover:text-gray-300 transition-colors"
              >
                Projects
              </Link>
              <span>/</span>
              <Link
                href={`/project/${id}`}
                className="hover:text-gray-300 transition-colors"
              >
                {project.name}
              </Link>
              <span>/</span>
              <span className="text-white font-medium">Settings</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-3 text-white">
                  Project Settings
                </h1>
                <p className="text-gray-400 text-lg">
                  Configure your project deployment and environment
                </p>
              </div>

              <Link
                href={`/project/${id}`}
                className="px-5 py-2.5 border border-gray-800 hover:bg-gray-900/30 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                ← Back to Project
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Information */}
              <div className="bg-gray-900/30/30 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-gray-900/30 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold">Project Information</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Project Name
                      </label>
                      <div className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 text-gray-300">
                        {project.name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Subdomain
                      </label>
                      <div className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 flex items-center gap-2">
                        <span className="truncate">{project.subDomain}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Git Repository
                    </label>
                    <div className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 font-mono text-sm break-all">
                      {project.gitURL}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Root Directory
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rootDirectory}
                        disabled={!isEditingRootDir}
                        onChange={(e) => setRootDirectory(e.target.value)}
                        placeholder="/ (root), client, frontend, src, etc."
                        className="flex-1 bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />

                      <button
                        onClick={() => {
                          if (isEditingRootDir) {
                            handleSaveRootDirectory();
                          } else {
                            setIsEditingRootDir(true);
                          }
                        }}
                        disabled={savingRootDir}
                        className="px-5 py-3 bg-gray-900/30 hover:bg-gray-900 hover:text-white border border-gray-800 rounded-lg font-medium transition-all disabled:opacity-50"
                      >
                        {savingRootDir
                          ? "Saving..."
                          : isEditingRootDir
                          ? "Update"
                          : "Edit"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Updates instantly, no redeployment needed
                    </p>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        Environment Variables
                      </h2>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Manage configuration and secrets
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-yellow-500 flex items-center gap-1.5 ">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Redeploy Required
                  </span>
                </div>

                {/* Add New Variable */}
                <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Add New Variable
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEnvKey}
                      onChange={(e) =>
                        setNewEnvKey(e.target.value.toUpperCase())
                      }
                      placeholder="VARIABLE_NAME"
                      className="flex-1 bg-black border border-gray-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-700 font-mono text-sm"
                    />
                    <input
                      type="text"
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="value"
                      className="flex-1 bg-black border border-gray-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-700 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={addEnvVariable}
                      className="px-5 py-2.5 text-black bg-gray-300 hover:bg-gray-200 rounded-lg transition-colors font-medium whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Existing Variables */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(envVariables).length > 0 ? (
                    Object.entries(envVariables).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3 group hover:border-gray-700 transition-colors"
                      >
                        <div className="font-mono text-sm flex-1 min-w-0">
                          <span className="text-blue-400 font-semibold">
                            {key}
                          </span>
                          <span className="text-gray-700 mx-2">=</span>
                          <span className="text-green-400 truncate">
                            {value}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEnvVariable(key)}
                          className="ml-4 text-red-400 transition-all px-3 py-1 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-900 rounded-lg">
                      <svg
                        className="w-12 h-12 text-gray-800 mx-auto mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <p className="text-gray-600 text-sm">
                        No environment variables configured
                      </p>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-6 pt-6 border-t border-gray-900">
                  <button
                    onClick={handleSaveAndRedeploy}
                    disabled={redeploying}
                    className="bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
                  >
                    {redeploying ? (
                      <>
                        <span className="w-5 h-5 rounded-full animate-spin"></span>
                        Redeploying...
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Save & Redeploy
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* CI/CD */}
              <CICDSettings projectId={project.id} />

              {/* Danger Zone */}
              <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-6 mb-16">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-red-950/50 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-500"
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
                  <h2 className="text-xl font-bold text-red-500">
                    Danger Zone
                  </h2>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium mb-1">Delete this project</p>
                    <p className="text-sm text-gray-500">
                      Permanently remove this project and all deployments
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-5 py-2.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 text-red-500 rounded-lg font-medium transition-all"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>

            {/* Build Settings */}
            <div className="space-y-6">
              <BuildSettings framework={project.framework} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#0b0b0b] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-900/20 border border-red-900/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-400"
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

              <h3 className="text-xl font-semibold text-white">
                Delete Project?
              </h3>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete{" "}
              <span className="text-white font-medium">{project.name}</span>?
              This action cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-medium py-2.5 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting…
                  </span>
                ) : (
                  "Delete"
                )}
              </button>

              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-900/40 hover:bg-gray-800 text-gray-300 font-medium py-2.5 transition-all disabled:opacity-50"
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

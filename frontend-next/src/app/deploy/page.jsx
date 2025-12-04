"use client";
import { useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";

export default function Deploy() {
  const { getToken } = useAuth();
  const [gitURL, setGitURL] = useState("");
  const [slug, setSlug] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState([]);
  const [deploymentData, setDeploymentData] = useState(null);

  const handleDeploy = async (e) => {
    const token = await getToken();
    e.preventDefault();
    if (!gitURL) return;

    setIsDeploying(true);
    setLogs([]);
    setDeploymentData(null);

    try {
      // Connect to WebSocket for logs
      const socket = io("http://localhost:9001");

      const response = await axios.post(
        "http://localhost:9000/api/project/",
        {
          gitURL,
          slug: slug || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { projectSlug, url } = response.data.data;
      setDeploymentData({ projectSlug, url });

      // Subscribe to logs
      socket.emit("subscribe", `logs:${projectSlug}`);
      socket.on("message", (data) => {
        try {
          const logData = JSON.parse(data);
          setLogs((prev) => [...prev, logData.log]);
        } catch (err) {
          setLogs((prev) => [...prev, data]);
        }
      });
    } catch (error) {
      console.error("Deployment failed:", error);
      setLogs((prev) => [
        ...prev,
        "❌ Deployment failed. Check console for details.",
      ]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Deploy Your Project
            </h1>
            <p className="text-gray-300 text-xl">
              Paste your GitHub repository URL and deploy instantly
            </p>
          </div>

          {/* Deployment Form */}
          <div className="glass-effect rounded-2xl p-8 mb-8">
            <form onSubmit={handleDeploy} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  value={gitURL}
                  onChange={(e) => setGitURL(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Subdomain (optional)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-awesome-project"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-sm text-gray-400 mt-2">
                  If not provided, a random name will be generated
                </p>
              </div>

              <button
                type="submit"
                disabled={isDeploying || !gitURL}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isDeploying ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Deploying...
                  </div>
                ) : (
                  "Deploy Now 🚀"
                )}
              </button>
            </form>
          </div>

          {/* Deployment Info */}
          {deploymentData && (
            <div className="glass-effect rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-4">Deployment Info</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300">Project Slug:</p>
                  <p className="text-xl font-mono">
                    {deploymentData.projectSlug}
                  </p>
                </div>
                <div>
                  <p className="text-gray-300">Deployment URL:</p>
                  <a
                    href={deploymentData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl text-purple-400 hover:text-purple-300 underline break-all"
                  >
                    {deploymentData.url}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Build Logs */}
          {logs.length > 0 && (
            <div className="glass-effect rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4">Build Logs</h3>
              <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

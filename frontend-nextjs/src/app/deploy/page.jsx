"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, ExternalLink, CheckCircle2 } from "lucide-react";
import { createProject } from "@/services/projectService";
import {
  disconnectGit,
  getGitRepos,
  getGitStatus,
} from "@/services/gitService";

export default function Deploy() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);

  const [formData, setFormData] = useState({
    projectName: "",
    slug: "",
    framework: "react",
    rootDirectory: "",
    envVariables: [{ key: "", value: "" }],
  });

  const [isDeploying, setIsDeploying] = useState(false);

  const frameworks = [
    { id: "react", name: "React", icon: "⚛️" },
    { id: "vue", name: "Vue", icon: "⚡" },
    { id: "angular", name: "Angular", icon: "🅰️" },
    { id: "svelte", name: "Svelte", icon: "🟧" },
  ];

  const API_URL = "http://localhost:9000/api/project";

  //api calls
  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      const token = await getToken();
      const response = await getGitStatus(token);

      setGithubConnected(response.connected);
      setGithubUsername(response.username);

      if (response.connected) {
        fetchRepositories();
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchRepositories = async () => {
    setLoadingRepos(true);
    try {
      const token = await getToken();
      const response = await getGitRepos(token);
      setRepositories(response.repositories);
    } finally {
      setLoadingRepos(false);
    }
  };

  const connectGitHub = () => {
    window.location.href = `${API_URL}/github/connect`;
  };

  const disconnectGitHub = async () => {
    const token = await getToken();
    await disconnectGit(token);
    toast.success("GitHub disconnected");
    setGithubConnected(false);
    setGithubUsername(null);
    setRepositories([]);
    setSelectedRepo(null);
  };

  const selectRepository = (repo) => {
    if (repo.isDeployed) {
      toast.error("This repository is already deployed");
      return;
    }

    setSelectedRepo(repo);
    setFormData((prev) => ({
      ...prev,
      projectName: repo.name,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEnvChange = (index, field, value) => {
    const updatedEnv = [...formData.envVariables];
    updatedEnv[index][field] = value;
    setFormData((prev) => ({ ...prev, envVariables: updatedEnv }));
  };

  const addEnvVariable = () => {
    setFormData((prev) => ({
      ...prev,
      envVariables: [...prev.envVariables, { key: "", value: "" }],
    }));
  };

  const removeEnvVariable = (index) => {
    const updatedEnv = formData.envVariables.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, envVariables: updatedEnv }));
  };

  const handleDeploy = async (e) => {
    e.preventDefault();

    if (!selectedRepo) {
      toast.error("Please select a repository");
      return;
    }

    setIsDeploying(true);

    try {
      const token = await getToken();

      const envObject = formData.envVariables.reduce((acc, env) => {
        if (env.key && env.value) acc[env.key] = env.value;
        return acc;
      }, {});

      const payload = {
        gitURL: selectedRepo.url,
        slug: formData.slug,
        projectName: formData.projectName,
        framework: formData.framework,
        rootDirectory: formData.rootDirectory,
        envVariables: envObject,
      };

      console.log(payload);

      const response = await createProject(payload, token);

      toast.success("Deployment started!");
      router.push(`/deployments/${response.data.deploymentId}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* GitHub Connection Card */}
        <div className="mb-8 p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  githubConnected ? "bg-green-500/20" : "bg-gray-800"
                }`}
              >
                <svg
                  className="w-7 h-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.758-1.333-1.758-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.998.108-.775.42-1.305.763-1.604-2.665-.303-5.466-1.334-5.466-5.932 0-1.31.469-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.48 11.48 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.292-1.553 3.298-1.23 3.298-1.23.655 1.653.243 2.873.12 3.176.77.84 1.234 1.912 1.234 3.222 0 4.61-2.805 5.625-5.475 5.922.431.37.814 1.103.814 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.302 24 12 24 5.372 18.628 0 12 0z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-semibold text-lg">GitHub Integration</h3>
                {githubConnected ? (
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Connected as @{githubUsername}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    Connect GitHub to import your repositories
                  </p>
                )}
              </div>
            </div>

            {githubConnected ? (
              <button
                onClick={disconnectGitHub}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-xl font-semibold transition-all"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectGitHub}
                className="px-6 py-3 bg-gradient-to-r text-black from-[#5227FF] to-[#FF9FFC] rounded-xl font-semibold hover:scale-105 transition-transform"
              >
                Connect GitHub
              </button>
            )}
          </div>
        </div>

        {!githubConnected ? (
          <div className="p-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
            <p className="text-yellow-400 text-lg">
              ⚠️ Please connect your GitHub account to deploy projects
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Repository Selection */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#B19EEF]">
                Import Repository
              </h2>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                />
              </div>

              {/* Repository List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {loadingRepos ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No repositories found
                  </p>
                ) : (
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => selectRepository(repo)}
                      disabled={repo.isDeployed}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        selectedRepo?.id === repo.id
                          ? "bg-[#5227FF]/20 border-[#5227FF]"
                          : repo.isDeployed
                          ? "bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed"
                          : "bg-gray-900/30 border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold truncate">
                              {repo.name}
                            </p>
                            {repo.private && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                                Private
                              </span>
                            )}
                            {repo.isDeployed && (
                              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Deployed
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-sm text-gray-400 truncate">
                              {repo.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Updated{" "}
                            {new Date(repo.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Configuration Form */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#B19EEF]">
                Configure Project
              </h2>

              {!selectedRepo ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-center">
                    Select a repository to configure deployment
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDeploy} className="space-y-4">
                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                      required
                    />
                  </div>

                  {/* Custom Slug */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">
                      Custom Subdomain (optional)
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="my-project"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty for auto-generated name
                    </p>
                  </div>

                  {/* Framework */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">
                      Framework
                    </label>
                    <select
                      name="framework"
                      value={formData.framework}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                    >
                      {frameworks.map((fw) => (
                        <option key={fw.id} value={fw.id}>
                          {fw.icon} {fw.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Root Directory */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">
                      Root Directory (optional)
                    </label>
                    <input
                      type="text"
                      name="rootDirectory"
                      value={formData.rootDirectory}
                      onChange={handleInputChange}
                      placeholder="ex: frontend, client, src, etc."
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                    />
                  </div>

                  {/* Environment Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Environment Variables
                      </label>
                      <button
                        type="button"
                        onClick={addEnvVariable}
                        className="text-sm text-[#FF9FFC] hover:text-[#5227FF]"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {formData.envVariables.map((env, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="KEY"
                            value={env.key}
                            onChange={(e) =>
                              handleEnvChange(index, "key", e.target.value)
                            }
                            className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#FF9FFC]"
                          />
                          <input
                            type="text"
                            placeholder="VALUE"
                            value={env.value}
                            onChange={(e) =>
                              handleEnvChange(index, "value", e.target.value)
                            }
                            className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#FF9FFC]"
                          />
                          <button
                            type="button"
                            onClick={() => removeEnvVariable(index)}
                            className="px-2 text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deploy Button */}
                  <button
                    type="submit"
                    disabled={isDeploying}
                    className="w-full bg-gradient-to-r text-black from-[#5227FF] to-[#FF9FFC] font-semibold py-4 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                  >
                    {isDeploying ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deploying...
                      </div>
                    ) : (
                      "Deploy Now 🚀"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(31 41 55);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(75 85 99);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(107 114 128);
        }
      `}</style>
    </div>
  );
}

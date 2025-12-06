"use client";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { createProject } from "@/services/projectService";
import toast from "react-hot-toast";

export default function Deploy() {
  const { getToken } = useAuth();

  const [formData, setFormData] = useState({
    gitURL: "",
    slug: "",
    projectName: "",
    framework: "react",
    rootDirectory: "",
    envVariables: [{ key: "", value: "" }],
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentData, setDeploymentData] = useState(null);
  const [deploymentId, setDeploymentId] = useState(null);
  const [isEdit, isSetEdit] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEnvChange = (index, field, value) => {
    const updatedEnv = [...formData.envVariables];
    updatedEnv[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      envVariables: updatedEnv,
    }));
  };

  const addEnvVariable = () => {
    setFormData((prev) => ({
      ...prev,
      envVariables: [...prev.envVariables, { key: "", value: "" }],
    }));
  };

  const removeEnvVariable = (index) => {
    const updatedEnv = [...formData.envVariables];
    updatedEnv.splice(index, 1);
    setFormData((prev) => ({
      ...prev,
      envVariables: updatedEnv,
    }));
  };

  const handleDeploy = async (e) => {
    e.preventDefault();
    console.log(formData);

    setIsDeploying(true);
    setDeploymentData(null);
    const token = await getToken();
    try {
      // Filter out empty env variables
      const envObject = formData.envVariables.reduce((acc, env) => {
        if (env.key && env.value) {
          acc[env.key] = env.value;
        }
        return acc;
      }, {});

      const response = await axios.post(
        "http://localhost:9000/api/project",
        {
          gitURL: formData.gitURL,
          slug: formData.slug,
          projectName: formData.projectName,
          framework: formData.framework,
          rootDirectory: formData.rootDirectory,
          envVariables: envObject,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(response);

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      const { projectSlug, url, deploymentId } = response.data.data;
      setDeploymentData({ projectSlug, url });
      setDeploymentId(deploymentId);
      return response;
    } catch (error) {
      console.error("Deployment failed:", error);
      toast.error("Deployment failed");
    }
  };

  const frameworks = [
    { id: "react", name: "React", icon: "⚛️" },
    { id: "next(static)", name: "Next.js", icon: "▲" },
    { id: "vue", name: "Vue", icon: "⚡" },
    { id: "angular", name: "Angular", icon: "🅰️" },
    { id: "svelte", name: "Svelte", icon: "🟧" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background Gradient */}
      <div className="" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Form */}
          <div className="flex mx-auto justify-center items-center">
            <div className="bg-black/50 backdrop-blur-sm border border-[#5227FF]/30 rounded-2xl p-8 w-[60%]">
              <h1 className="text-2xl pb-4 font-semibold text-[#B19EEF]">
                New Project
              </h1>
              <form onSubmit={handleDeploy} className="space-y-6 ">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400 leading-relaxed">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    placeholder="My Awesome Project"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {/* GitHub URL */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400 leading-relaxed">
                    GitHub Repository URL *
                  </label>
                  <input
                    type="url"
                    name="gitURL"
                    value={formData.gitURL}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {/* Custom Slug */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400 leading-relaxed">
                    Custom Subdomain (optional)
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-3 bg-gray-900/50 border border-r-0 border-gray-700 rounded-l-lg">
                      https://
                    </span>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="my-project"
                      className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-r-lg focus:ring-2 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                    />
                    <span className="px-3 py-3 bg-gray-900/50 border border-l-0 border-gray-700 rounded-r-lg">
                      .nextdeploy.app
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    If left empty, a random name will be generated
                  </p>
                </div>

                {/* Framework Selection */}
                <select
                  className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-lg 
             focus:ring-2 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      framework: e.target.value,
                    }))
                  }
                >
                  {frameworks.map((framework) => (
                    <option key={framework.id} value={framework.name}>
                      {framework.icon} {framework.name}
                    </option>
                  ))}
                </select>

                {/* Root Directory */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400 leading-relaxed">
                    Root Directory (optional)
                  </label>
                  <input
                    type="text"
                    name="rootDirectory"
                    value={isEdit ? formData.rootDirectory : "./"}
                    onChange={handleInputChange}
                    disabled={!isEdit}
                    placeholder="e.g., frontend, app, src"
                    className="w-[87%] px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    className="px-4 py-3 border border-gray-600 rounded-md ml-2.5 text-[0.9rem] cursor-pointer"
                    onClick={() => isSetEdit(true)}
                  >
                    Edit
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Specify subdirectory if your project is not in repository
                    root
                  </p>
                </div>

                {/* Build Configuration */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400 leading-relaxed">
                      Build Command
                    </label>
                    <input
                      type="text"
                      value="npm run build"
                      disabled
                      className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This command will be executed during build
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400 leading-relaxed">
                      Install Command
                    </label>
                    <input
                      type="text"
                      value="npm install"
                      disabled
                      className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Dependencies will be installed using npm
                    </p>
                  </div>
                </div>

                {/* Environment Variables */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-400 leading-relaxed">
                      Environment Variables (optional)
                    </label>
                    <button
                      type="button"
                      onClick={addEnvVariable}
                      className="text-sm text-[#FF9FFC] hover:text-[#5227FF] transition-colors cursor-pointer"
                    >
                      + Add Variable
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.envVariables.map((env, index) => (
                      <div key={index} className="flex gap-3">
                        <input
                          type="text"
                          placeholder="KEY"
                          value={env.key}
                          onChange={(e) =>
                            handleEnvChange(index, "key", e.target.value)
                          }
                          className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                        />
                        <input
                          type="text"
                          placeholder="VALUE"
                          value={env.value}
                          onChange={(e) =>
                            handleEnvChange(index, "value", e.target.value)
                          }
                          className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeEnvVariable(index)}
                          className="px-3 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
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
                  className="w-full bg-gradient-to-r cursor-pointer from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] text-white font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-[#5227FF]/20"
                >
                  {isDeploying ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                      Deploying...
                    </div>
                  ) : (
                    "Deploy Now 🚀"
                  )}
                </button>
              </form>
            </div>

            {/* Deployment Status */}
            {deploymentData && (
              <div className="bg-black/50 backdrop-blur-sm border border-[#5227FF]/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <span className="mr-2">🚀</span> Deployment Active
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      Building
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Project URL</p>
                    <a
                      href={deploymentData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF9FFC] hover:text-[#5227FF] break-all"
                    >
                      {deploymentData.url}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Deployment ID</p>
                    <p className="font-mono text-sm">{deploymentId}</p>
                  </div>
                  <Link
                    href={`/logs/${deploymentId}`}
                    className="block w-full text-center py-2 border border-[#5227FF] text-[#FF9FFC] hover:bg-[#5227FF]/10 rounded-lg transition-colors"
                  >
                    View Live Logs →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { checkGitURLExists, createProject } from "@/services/projectService";
import toast from "react-hot-toast";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronDown } from "lucide-react"; // or any icon you like
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [checkingURL, setCheckingURL] = useState(false);
  const [existingProject, setExistingProject] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // ✅ Check Git URL on blur
  const handleGitURLBlur = async () => {
    if (!formData.gitURL) return;

    setCheckingURL(true);
    setExistingProject(null);

    try {
      const token = await getToken();
      const result = await checkGitURLExists(token, formData.gitURL);

      if (result.exists) {
        setExistingProject(result.project);
        setIsDuplicate(true);
        toast.error("This Git repository is already deployed!");
      } else {
        setIsDuplicate(false);
      }
    } finally {
      setCheckingURL(false);
    }
  };

  //controlled components
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear existing project warning when user changes Git URL
    if (name === "gitURL") {
      setExistingProject(null);
      setIsDuplicate(false);
    }
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

  //reset form
  const resetForm = () => {
    setFormData({
      gitURL: "",
      slug: "",
      projectName: "",
      framework: "react",
      rootDirectory: "",
      envVariables: [{ key: "", value: "" }],
    });
  };

  //api call
  const handleDeploy = async (e) => {
    e.preventDefault();

    setIsDeploying(true);
    setDeploymentData(null);

    if (isDuplicate) {
      setIsDeploying(false);
      return;
    }

    const token = await getToken();

    try {
      // Filter environment variables
      const envObject = formData.envVariables.reduce((acc, env) => {
        if (env.key && env.value) acc[env.key] = env.value;
        return acc;
      }, {});

      const payload = {
        gitURL: formData.gitURL,
        slug: formData.slug,
        projectName: formData.projectName,
        framework: formData.framework,
        rootDirectory: formData.rootDirectory,
        envVariables: envObject,
      };
      // console.log(payload)

      const response = await createProject(token, payload);

      const { projectSlug, url, deploymentId } = response.data;
      setDeploymentData({ projectSlug, url });
      setDeploymentId(deploymentId);
      resetForm();
      router.push(`/deployments/${deploymentId}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const frameworks = [
    { id: "react", name: "React", icon: "⚛️" },
    { id: "next(static)", name: "Next.js", icon: "▲" },
    { id: "vue", name: "Vue", icon: "⚡" },
    { id: "angular", name: "Angular", icon: "🅰️" },
    { id: "svelte", name: "Svelte", icon: "🟧" },
  ];

  const [selectedFramework, setSelectedFramework] = useState(frameworks[0]);

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
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
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
                    onBlur={handleGitURLBlur}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                {checkingURL && (
                  <p className="text-sm text-blue-400 mt-2 flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                    Checking repository...
                  </p>
                )}

                {/* ✅ Warning if repository already exists */}
                {existingProject && (
                  <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-400 text-xl">⚠️</span>
                      <div className="flex-1">
                        <p className="text-yellow-400 font-medium mb-2">
                          This repository is already deployed!
                        </p>
                        <p className="text-sm text-gray-300 mb-3">
                          Project: <strong>{existingProject.name}</strong>
                        </p>
                        <div className="flex gap-2">
                          <Link
                            href={`/project/${existingProject.id}`}
                            className="text-sm px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg transition-colors"
                          >
                            View Existing Project
                          </Link>
                          <a
                            href={existingProject.url}
                            target="_blank"
                            className="text-sm px-4 py-2 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                          >
                            Visit Site
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                      className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-r-lg focus:ring-1 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
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
                <Listbox
                  value={selectedFramework}
                  onChange={(value) => {
                    setSelectedFramework(value);
                    setFormData((prev) => ({
                      ...prev,
                      framework: value.name,
                    }));
                  }}
                >
                  <ListboxButton
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 
                 flex items-center justify-between text-white rounded-lg text-left focus:ring-1 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
                  >
                    {selectedFramework.icon} {selectedFramework.name}
                    {/* RIGHT SIDE DROPDOWN ARROW */}
                    <ChevronDown
                      size={20}
                      className="text-gray-400 cursor-pointer"
                    />
                  </ListboxButton>

                  <ListboxOptions
                    className="mt-1 w-full bg-gray-900/90 border border-gray-700 
               rounded-lg shadow-lg text-white p-1 focus:outline-none focus:ring-0"
                  >
                    {frameworks.map((framework) => (
                      <ListboxOption
                        key={framework.id}
                        value={framework}
                        className={({ active, selected }) =>
                          `cursor-pointer px-4 py-3 rounded-lg transition-all
          ${active ? "bg-gray-800 text-[#FF9FFC]" : "text-gray-200"}
          ${selected ? "bg-gray-800/70" : ""}`
                        }
                      >
                        {framework.icon} {framework.name}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>

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
                    className="w-[87%] px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-1 focus:ring-[#FF9FFC] focus:border-transparent outline-none transition-all"
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
                  className="w-full bg-gradient-to-r cursor-pointer text-black from-[#5227FF] to-[#FF9FFC] hover:from-[#5227FF] hover:to-[#FF9FFC] font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-[#5227FF]/20"
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
          </div>
        </div>
      </div>
    </div>
  );
}

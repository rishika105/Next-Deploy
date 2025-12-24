"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Footer from "../../components/Footer";
import { getProjects } from "@/services/projectService";
import { useRouter } from "next/navigation";
import { EllipsisVertical, Search } from "lucide-react";

export default function Overview() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const router = useRouter();
  const [openModalId, setOpenModalId] = useState(null);
  const modalRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(null);
  const [searchedProjects, setSearchedProjects] = useState(null);

  //settings modal
  //on click outside close modal
  useEffect(() => {
    if (!openModalId) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setOpenModalId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openModalId]);

  //get repo path
  const getRepoPath = (url) => {
    try {
      const parts = url.split("/");
      const owner = parts[parts.length - 2];
      const repo = parts[parts.length - 1].replace(".git", "");
      return `${owner}/${repo}`;
    } catch {
      return "unknown/repo";
    }
  };

  //api calls
  const fetchAllProjects = async () => {
    const token = await getToken();
    try {
      setLoading(true);
      const response = await getProjects(null, token);
      // console.log(response);
      setProjects(response.projects);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProjects();
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      const token = await getToken();
      const response = await getProjects(searchTerm, token);
      setProjects(response.projects);
    }, 400);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  //format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="min-h-screen bg-black mx-auto text-white">
        <div className="container mx-auto px-4 py-8  w-[90%] ">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between ">
            <div>
              <h1 className="font-bold mb-2 text-2xl">
                <span className="bg-gradient-to-r text-gray-100 bg-clip-text">
                  My Projects
                </span>
              </h1>
            </div>

            {/* Search projects */}
            <input
              className="bg-black py-3 px-4 w-[70%] rounded-md border border-gray-700 hover:border-gray-600"
              placeholder="🔍︎ Search projects"
              value={searchTerm === null ? "" : searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Link
              href="/deploy"
              className="bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
            >
              + Add Project
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading Projects...</p>
              </div>
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">No projects yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Deploy your first project and see it appear here with all its
                deployment details.
              </p>
              <Link
                href="/deploy"
                className="inline-flex items-center space-x-2 border border-[#574d81] px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 border-shadow-fuchsia-500"
              >
                <span>Create Your First Project</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                  <p className="text-gray-400 text-sm mb-1">Total Projects</p>
                  <p className="text-3xl font-bold">{projects?.length}</p>
                </div>
              </div>

              {/* Projects Grid */}
              <div className="min-h-screen">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects?.map((project) => (
                    <div
                      key={project?.subDomain}
                      onClick={() => router.push(`/project/${project.id}`)}
                      className="group relative bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 flex flex-col gap-2"
                    >
                      {/* project name */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold mb-1 group-hover:text-[#FF9FFC] transition-colors">
                            {project.name}
                          </h3>
                        </div>
                      </div>

                      {/* Settings modal */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(project.id);
                          setOpenModalId(
                            openModalId === project.id ? null : project.id
                          );
                        }}
                      >
                        <EllipsisVertical className="cursor-pointer size-5 absolute z-10 right-4 top-6" />
                      </div>

                      {openModalId === project.id && (
                        <div
                          ref={modalRef}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-black absolute w-[40%] right-4 top-6 z-20 text-sm p-2 border border-gray-800 rounded-md"
                        >
                          <button
                            className="w-full text-left hover:bg-gray-900 cursor-pointer p-2 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenModalId(null);
                              router.push(`/project/${project.id}/settings`);
                            }}
                          >
                            Settings
                          </button>
                          <button
                            className="w-full text-left hover:bg-gray-900 cursor-pointer p-2 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenModalId(null);
                              router.push(`/analytics/${project.id}`);
                            }}
                          >
                            Web Analytics
                          </button>
                        </div>
                      )}

                      {/* project deployed url */}
                      {project.Deployment[0].status == "READY" ? (
                        <Link
                          key={project.id}
                          href={`http://${project.subDomain}.localhost:8000`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          rel="noopener noreferrer"
                          className=" font-extralight text-sm underline text-gray-400"
                        >
                          {}
                          http://{project?.subDomain}/localhost:8000
                        </Link>
                      ) : (
                        <div className="text-red-400 opacity-70 text-sm">
                          Deployment failed.
                        </div>
                      )}
                      {/* giturl */}
                      <Link
                        key={project.subDomain}
                        href={project.gitURL}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        className="inline-flex w-fit mt-2 items-center gap-2 bg-gray-800/60 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-300 hover:bg-gray-700 hover:border-[#5227FF] transition-all"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4 text-gray-400"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.758-1.333-1.758-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.998.108-.775.42-1.305.763-1.604-2.665-.303-5.466-1.334-5.466-5.932 0-1.31.469-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.48 11.48 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.292-1.553 3.298-1.23 3.298-1.23.655 1.653.243 2.873.12 3.176.77.84 1.234 1.912 1.234 3.222 0 4.61-2.805 5.625-5.475 5.922.431.37.814 1.103.814 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.302 24 12 24 5.372 18.628 0 12 0z"
                          />
                        </svg>
                        {getRepoPath(project.gitURL)}
                      </Link>
                      {/* created at */}
                      <div className="flex items-center justify-between pt-4 border-t mt-3 border-gray-800">
                        <div>
                          <p className="text-sm text-gray-400"></p>
                          <p className="text-gray-300 text-sm">
                            Created: {formatDate(project.createdAt)}
                          </p>
                        </div>
                        <span className="text-[#5227FF] group-hover:translate-x-1 transition-transform cursor-pointer">
                          →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import {
  getDeploymentDetails,
  getDeploymentLogs,
} from "@/services/deployService";
import { MessageSquareShare } from "lucide-react";
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";
import { redeployProject } from "@/services/projectService";

export default function DeploymentDetailPage() {
  const { id } = useParams();
  const { getToken } = useAuth();

  const [deployment, setDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const pollingIntervalRef = useRef(null);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);
  const FINAL_STATUSES = ["READY", "FAIL"];

  // Detect manual scrolling to disable auto-scroll
  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setAutoScroll(isAtBottom);
  };

  //API CALLS
  useEffect(() => {
    fetchDeploymentDetails();
    fetchLogs();

    // Poll every 3 seconds (increased from 2 for better stability)
    pollingIntervalRef.current = setInterval(() => {
      fetchDeploymentDetails();
      fetchLogs();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id]);

  // Stop polling when deployment reaches final status
  useEffect(() => {
    if (deployment && FINAL_STATUSES.includes(deployment.status)) {
      // Wait 10 seconds after final status to catch any trailing logs
      setTimeout(() => {
        setIsPolling(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 5000);
    }
  }, [deployment]);

  const fetchDeploymentDetails = async () => {
    try {
      const token = await getToken();
      const response = await getDeploymentDetails(id, token);
      setDeployment(response);
    } catch (error) {
      console.error("Error fetching deployment details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = await getToken();
      const response = await getDeploymentLogs(id, token);
      const logsArray = response.rawLogs.data ?? [];

      const sorted = [...logsArray].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      setLogs(sorted);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRedeploy = async (projectId, envVariables) => {
    const token = await getToken();
    const toastId = toast.loading("Loading...");
    try {
      const response = await redeployProject(token, envVariables, projectId);
      //console.log("REDEPLOY RESPONSE ", response);
      toast.success("Redeploying started!");
      const id = response.deploymentId;
      router.push(`/deployments/${id}`);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading deployment...</p>
        </div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Deployment not found</h2>
          <Link href="/deployments" className="text-[#FF9FFC] underline">
            Return to deployments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black mx-auto text-white mb-20">
        <div className="container mx-auto px-4 py-8 w-[90%]">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <Link href="/deployments" className="hover:text-white">
                Deployments
              </Link>
              <span>→</span>
              <span className="text-white">{id.substring(0, 12)}...</span>
            </div>

            <div className="flex justify-between">
              <h1 className="text-2xl font-bold">Deployment Details</h1>

              <div className="flex gap-4">
                {/* Show redeploy button if fail otherwise share on ready */}
                {deployment.status === "READY" && (
                  <button
                    onClick={() => {
                      copy(deployment.url);
                      toast.success("Copied to clipboard");
                    }}
                    className="px-5 py-2.5 border border-gray-800 bg-gray-900/30 rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    <MessageSquareShare className="size-4" /> Share
                  </button>
                )}
                {deployment.status === "FAIL" && (
                  <button
                    onClick={() =>
                      handleRedeploy(
                        deployment.projectId,
                        deployment.envVariables //send the same env vars
                      )
                    }
                    className="px-5 py-2.5 border border-gray-800 bg-gray-900/30 rounded-lg font-medium transition-all flex items-center gap-2"
                  >
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
                    </svg>{" "}
                    Redeploy
                  </button>
                )}

                <Link
                  href={`/project/${deployment.projectId}`}
                  className="bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
                >
                  Go to Project →
                </Link>
              </div>
            </div>
          </div>

          {/* Deployment Info Card */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-6">Deployment Information</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Deployment ID</p>
                <p className="text-white font-mono text-sm break-all">
                  {deployment.id}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      deployment.status === "READY"
                        ? "bg-green-400"
                        : deployment.status === "IN_PROGRESS"
                        ? "bg-blue-400 animate-pulse"
                        : deployment.status === "FAIL"
                        ? "bg-red-400"
                        : "bg-yellow-400"
                    }`}
                  ></span>
                  <span className="text-white">{deployment.status}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Project</p>
                <Link
                  href={`/project/${deployment?.projectId}`}
                  className="text-[#FF9FFC] hover:underline"
                >
                  {deployment?.projectName || "View Project"}
                </Link>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Created</p>
                <p className="text-white text-sm">
                  {formatDate(deployment.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                <p className="text-white text-sm">
                  {formatDate(deployment.updatedAt)}
                </p>
              </div>
              {/* ONLY SHOW URL WHEN READY */}
              {deployment.status === "READY" && deployment.url && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Deployed URL</p>
                  <a
                    href={deployment.url}
                    target="_blank"
                    className="text-blue-400 hover:underline text-sm break-all"
                  >
                    {deployment.url}
                  </a>
                </div>
              )}
            </div>

            {/* Polling Indicator */}
            <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
              <div className="flex items-center">
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isPolling ? "bg-green-400 animate-pulse" : "bg-gray-400"
                  }`}
                ></span>
                <span className="text-sm text-gray-400">
                  {isPolling
                    ? "Live polling active"
                    : "Polling stopped - deployment completed"}
                </span>
              </div>
              {!isPolling && (
                <button
                  onClick={() => {
                    setIsPolling(true);
                    fetchDeploymentDetails();
                    fetchLogs();

                    // Restart polling
                    if (pollingIntervalRef.current) {
                      clearInterval(pollingIntervalRef.current);
                    }
                    pollingIntervalRef.current = setInterval(() => {
                      fetchDeploymentDetails();
                      fetchLogs();
                    }, 3000);
                  }}
                  className="text-sm px-4 py-2 bg-[#5227FF]/20 hover:bg-[#5227FF]/30 text-[#FF9FFC] rounded-lg transition-colors"
                >
                  Resume Polling
                </button>
              )}
            </div>
          </div>

          {/* Logs Section */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden">
            <div className="bg-gray-900/50 border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold">Build Logs</h3>
                  <span className="text-sm text-gray-400">
                    {logs.length} entries
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      fetchLogs();
                      fetchDeploymentDetails();
                    }}
                    className="text-sm px-3 py-1 bg-gray-800/60 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => {
                      setAutoScroll(true);
                      logsEndRef.current?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                    className="text-sm px-3 py-1 bg-gray-800/60 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                  >
                    ↓ Jump to Bottom
                  </button>
                </div>
              </div>
            </div>

            {/* Logs Container - Fixed height with proper scrolling */}
            <div
              ref={logsContainerRef}
              onScroll={handleScroll}
              className="h-[500px] overflow-y-auto p-6 font-mono text-sm bg-black/30"
              style={{ scrollBehavior: "smooth" }}
            >
              {logsLoading && logs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading logs...</p>
                  </div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">
                    {isPolling ? "Waiting for logs..." : "No logs available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div
                      key={`${log.timestamp}-${index}`}
                      className={`p-2 rounded ${
                        log.log.startsWith("ERROR") || log.log.includes("error")
                          ? "bg-red-500/10 border-l-4 border-red-500"
                          : log.log.startsWith("WARN") ||
                            log.log.includes("warning")
                          ? "bg-yellow-500/10 border-l-4 border-yellow-500"
                          : log.log.includes("Uploading") ||
                            log.log.includes("✅") ||
                            log.log.includes("success")
                          ? "bg-green-500/10 border-l-4 border-green-500"
                          : "hover:bg-gray-800/50 border-l-4 border-gray-700"
                      }`}
                    >
                      <div className="flex gap-4">
                        <span className="text-gray-500 w-20 flex-shrink-0 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span className="flex-1 break-words">{log.log}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>

            {/* Status Banner */}
            {deployment && FINAL_STATUSES.includes(deployment.status) && (
              <div
                className={`px-6 py-3 ${
                  deployment.status === "READY"
                    ? "bg-green-500/10 border-t border-green-500/30"
                    : "bg-red-500/10 border-t border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {deployment.status === "READY" ? (
                      <>
                        <span className="text-green-400 mr-2">✓</span>
                        <span className="text-green-400">
                          Deployment completed successfully!
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 mr-2">✗</span>
                        <span className="text-red-400">Deployment failed!</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Last updated:{" "}
                    {new Date(deployment.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

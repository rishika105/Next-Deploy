"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import {getDeploymentDetails, getDeploymentLogs } from "@/services/deployService";
import Footer from "@/app/components/Footer";

export default function LogsPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploymentInfo, setDeploymentInfo] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Final states that stop polling
  const FINAL_STATUSES = ["READY", "FAIL"];

  useEffect(() => {
    fetchDeploymentInfo();
    startPollingLogs();

    // Poll every 2 seconds for logs
    pollingIntervalRef.current = setInterval(() => {
      if (isPolling) {
        startPollingLogs();
        fetchDeploymentInfo(); // Also poll for status updates
      }
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id, isPolling]);

  // Stop polling when deployment reaches final status
  useEffect(() => {
    if (deploymentInfo && FINAL_STATUSES.includes(deploymentInfo.status)) {
      console.log("Deployment completed, stopping polling");
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
  }, [deploymentInfo]);

  const fetchDeploymentInfo = async () => {
    try {
      const token = await getToken();
      const response = await getDeploymentDetails(id, token);
      setDeploymentInfo(response.data);
    } catch (err) {
      console.error("Failed to fetch deployment info:", err);
    }
  };

  const startPollingLogs = async () => {
    try {
      const token = await getToken();
      const response = await getDeploymentLogs(id, token);

      if (response.data.rawLogs) {
        const sorted = response.data.rawLogs.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        setLogs(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshLogs = async () => {
    await fetchDeploymentInfo();
    await startPollingLogs();
  };

  // Add a button to restart polling if needed
  const restartPolling = () => {
    setIsPolling(true);
    refreshLogs();

    // Restart interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      if (isPolling) {
        startPollingLogs();
        fetchDeploymentInfo();
      }
    }, 2000);
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

  return (
    <>
      <div className="min-h-screen w-[90%] mx-auto text-white mb-40">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold mb-2">Build Logs</h1>
                <p className="text-gray-400">
                  Real-time logs for deployment:{" "}
                  <span className="font-mono text-[#c8b5c8]">{id}</span>
                </p>
              </div>
              {deploymentInfo && (
                <div className="flex items-center space-x-4">
                  <div
                    className={`px-4 py-2 rounded-full ${getStatusColor(
                      deploymentInfo?.status
                    )}`}
                  >
                    {deploymentInfo?.status}
                    {!isPolling && " (Completed)"}
                  </div>
                  <a
                    href={deploymentInfo?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
                  >
                    Visit Site
                  </a>
                </div>
              )}
            </div>

            {/* Polling Status Indicator */}
            <div className="mt-4 flex items-center">
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
              <br></br>
            </div>

            {deploymentInfo?.status === "READY" ? (
              <div className="text-md mt-2">
                Deployed link:{" "}
                <a
                  href={deploymentInfo?.url}
                  target="_blank"
                  className="underline text-gray-100 italic"
                >
                  {deploymentInfo?.url}
                </a>
              </div>
            ) : (
              <div></div>
            )}
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Logs Panel */}
            <div className="lg:col-span-3">
              <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-900/50 border-b border-gray-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Build Output</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-400">
                        {logs.length} log entries
                      </span>
                      <div className="flex items-center">
                        <span
                          className={`w-2 h-2 rounded-full mr-2 ${
                            isPolling
                              ? "bg-green-400 animate-pulse"
                              : "bg-gray-400"
                          }`}
                        ></span>
                        <span className="text-sm">
                          {isPolling ? "Live" : "Paused"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="h-[600px] overflow-y-auto p-6 font-mono text-sm bg-black/30"
                  onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.target;

                    // User is at bottom
                    if (scrollTop + clientHeight >= scrollHeight - 10) {
                      setAutoScroll(true);
                    } else {
                      // User scrolls up → disable auto scroll
                      setAutoScroll(false);
                    }
                  }}
                >
                  {loading && logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#5227FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading logs...</p>
                      </div>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">
                        {isPolling
                          ? "Waiting for logs..."
                          : "No logs available"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded 
                        ${
                          log.log.startsWith("ERROR")
                            ? "bg-red-500/10 border-l-4 border-red-500"
                            : log.log.startsWith("WARN")
                            ? "bg-yellow-500/10 border-l-4 border-yellow-500"
                            : (log.log.includes("uploaded") || log.log.includes("✅"))
                            ? "bg-green-500/10 border-l-4 border-green-500"
                            : "hover:bg-gray-800/50 border-l-4 border-gray-700"
                        }`}
                        >
                          <div className="flex">
                            <span className="text-gray-500 mr-4 w-16">
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                            <span className="flex-1">{log.log}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Auto-scroll only when polling is active */}
                  {isPolling && autoScroll && (
                    <div
                      ref={(el) => {
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    />
                  )}
                </div>

                {/* Status Banner when deployment is complete */}
                {deploymentInfo &&
                  FINAL_STATUSES.includes(deploymentInfo?.status) && (
                    <div
                      className={`px-6 py-3 ${
                        deploymentInfo?.status === "READY"
                          ? "bg-green-500/10 border-t border-green-500/30"
                          : "bg-red-500/10 border-t border-red-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {deploymentInfo.status === "READY" ? (
                            <>
                              <span className="text-green-400 mr-2">✓</span>
                              <span className="text-green-400">
                                Deployment completed successfully!
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-red-400 mr-2">✗</span>
                              <span className="text-red-400">
                                Deployment failed!
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          Last updated:{" "}
                          {new Date(
                            deploymentInfo.updatedAt
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Deployment Info Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {deploymentInfo && (
                <>
                  <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4">
                      Deployment Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <div className="flex items-center">
                          <p className="font-medium mr-2">
                            {deploymentInfo.status}
                          </p>
                          {FINAL_STATUSES.includes(deploymentInfo.status) && (
                            <span className="text-xs px-2 py-1 bg-gray-700/50 rounded">
                              Final
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Project</p>
                        <p className="font-medium">
                          {deploymentInfo.projectName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Created</p>
                        <p className="font-medium">
                          {new Date(deploymentInfo.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Last Updated</p>
                        <p className="font-medium">
                          {new Date(deploymentInfo.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold mb-4">Log Controls</h3>
                    <div className="space-y-3">
                      <button
                        onClick={refreshLogs}
                        className="w-full bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20"
                      >
                        Refresh Now
                      </button>

                      {isPolling ? (
                        <button
                          onClick={() => setIsPolling(false)}
                          className="w-full border border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400 py-2 rounded-lg transition-colors"
                        >
                          Stop Polling
                        </button>
                      ) : (
                        <button
                          onClick={restartPolling}
                          className="w-full border border-green-500/30 hover:bg-green-500/10 text-green-400 py-2 rounded-lg transition-colors"
                        >
                          Start Polling
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

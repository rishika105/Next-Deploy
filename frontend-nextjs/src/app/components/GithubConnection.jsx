// Add this component to your dashboard or deploy page

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = "http://localhost:9000/api/project";

export default function GitHubConnection() {
  const { getToken } = useAuth();
  const [githubStatus, setGithubStatus] = useState({
    connected: false,
    username: null,
    loading: true
  });

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/github/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGithubStatus({
        connected: response.data.connected,
        username: response.data.username,
        loading: false
      });
    } catch (error) {
      console.error("Failed to check GitHub status:", error);
      setGithubStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const connectGitHub = () => {
    window.location.href = `${API_URL}/github/connect`;
  };

  const disconnectGitHub = async () => {
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/github/disconnect`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success("GitHub disconnected");
      checkGitHubStatus();
    } catch (error) {
      toast.error("Failed to disconnect GitHub");
    }
  };

  if (githubStatus.loading) {
    return (
      <div className="p-4 bg-gray-900/30 border border-gray-700 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400">Checking GitHub connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* GitHub Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            githubStatus.connected ? 'bg-green-500/20' : 'bg-gray-800'
          }`}>
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.758-1.333-1.758-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.998.108-.775.42-1.305.763-1.604-2.665-.303-5.466-1.334-5.466-5.932 0-1.31.469-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.48 11.48 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.292-1.553 3.298-1.23 3.298-1.23.655 1.653.243 2.873.12 3.176.77.84 1.234 1.912 1.234 3.222 0 4.61-2.805 5.625-5.475 5.922.431.37.814 1.103.814 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.302 24 12 24 5.372 18.628 0 12 0z" />
            </svg>
          </div>

          <div>
            <h3 className="font-semibold text-lg">GitHub Integration</h3>
            {githubStatus.connected ? (
              <p className="text-sm text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Connected as @{githubStatus.username}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Connect your GitHub account to deploy repositories
              </p>
            )}
          </div>
        </div>

        {githubStatus.connected ? (
          <button
            onClick={disconnectGitHub}
            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-xl font-semibold transition-all"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connectGitHub}
            className="px-6 py-3 bg-gradient-to-r text-black from-[#6755ae] to-[#FF9FFC] rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#5227FF]/20 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.758-1.333-1.758-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.998.108-.775.42-1.305.763-1.604-2.665-.303-5.466-1.334-5.466-5.932 0-1.31.469-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.48 11.48 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.292-1.553 3.298-1.23 3.298-1.23.655 1.653.243 2.873.12 3.176.77.84 1.234 1.912 1.234 3.222 0 4.61-2.805 5.625-5.475 5.922.431.37.814 1.103.814 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.302 24 12 24 5.372 18.628 0 12 0z" />
            </svg>
            Connect GitHub
          </button>
        )}
      </div>

      {!githubStatus.connected && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            You must connect GitHub before deploying any repositories
          </p>
        </div>
      )}
    </div>
  );
}
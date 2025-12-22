"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";
import {
  disableWebhook,
  getWebHookStatus,
  webHookSetupCICD,
} from "@/services/webHookService";

export default function CICDSettings({ projectId }) {
  const { getToken } = useAuth();
  const [webhookStatus, setWebhookStatus] = useState({
    enabled: false,
    loading: true,
  });
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    checkWebhookStatus();
  }, [projectId]);

  const checkWebhookStatus = async () => {
    try {
      const token = await getToken();
      const response = await getWebHookStatus(projectId, token);

      setWebhookStatus({
        enabled: response.webhookEnabled,
        loading: false,
      });
    } finally {
      setWebhookStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleAutoDeployment = async () => {
    setToggling(true);
    try {
      const token = await getToken();

      if (webhookStatus.enabled) {
        // Disable
        await disableWebhook(projectId, token);
        toast.success("Auto-deploy disabled");
        setWebhookStatus({ enabled: false, loading: false });
      } else {
        // Enable
        await webHookSetupCICD(projectId, token);

        toast.success("Auto-deploy enabled!");
        setWebhookStatus({ enabled: true, loading: false });
      }
    } finally {
      setToggling(false);
    }
  };

  //!*************!
  //   if (webhookStatus.loading) {
  //     return toast.loading("Loading...");
  //   }
  // toast.loading() creates a new toast on every render
  // Return jsx instead
  // Component keeps re-rendering → loading never resolves
  // You’re effectively stuck in a render loop
  // ⚠️ Never call side-effects inside render

  if (webhookStatus.loading) {
    return (
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
        <p className="text-sm text-gray-400">Loading CI/CD settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold">CI/CD & Automated Deployments</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Automatically deploy on git push
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gray-900/30 border border-gray-800 rounded-lg p-4">
        <div>
          <p className="font-medium mb-1">Enable Automated Deployments</p>
          <p className="text-sm text-gray-500">
            Trigger deployments automatically when you push to your repository
          </p>
        </div>

        <button
          onClick={toggleAutoDeployment}
          disabled={toggling}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            webhookStatus.enabled ? "bg-white" : "bg-gray-800"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
              webhookStatus.enabled
                ? "translate-x-6 bg-black"
                : "translate-x-1 bg-gray-600"
            }`}
          />
        </button>
      </div>

      {webhookStatus.enabled && (
        <div className="mt-4 p-4 bg-gray-900/30 border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-300 flex items-start gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              CI/CD is enabled. Your project will automatically redeploy on git
              push events.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

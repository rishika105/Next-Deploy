import api from "./api/apiClient";

export async function fetchAllDeployments(token) {
  const res = await api.get("/deployment", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getDeploymentDetails(deploymentId, token) {
  const res = await api.get(`/deployment/${deploymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function fetchDeploymentsByProject(projectId, token) {
  const res = await api.get(`/deployment/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export const getDeploymentLogs = (deploymentId, token) => {
  return api.get(`/logs/${deploymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

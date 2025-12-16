import api from "./api/apiClient";

export async function getAllDeployments(token) {
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

export const getDeploymentLogs = (deploymentId, token) => {
  return api.get(`/logs/${deploymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

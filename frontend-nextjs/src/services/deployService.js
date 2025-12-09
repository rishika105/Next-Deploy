import axios from "axios";

const API_URL = "http://localhost:9000/api";

export async function fetchAllDeployments(token) {
  const res = await axios.get(`${API_URL}/deployment`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function fetchDeploymentStatus(deploymentId, token) {
  const res = await axios.get(`${API_URL}/deployment/status/${deploymentId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function fetchDeploymentsByProject(projectId, token) {
  const res = await axios.get(`${API_URL}/deployment/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export const getDeploymentInfo = async (id, token) => {
  return axios.get(`${API_URL}/project/deployment/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getDeploymentLogs = async (id, token) => {
  return axios.get(`${API_URL}/logs/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

import api from "./api/apiClient";

export const createProject = async (token, data) => {
  const res = await api.post("/project", data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

export const fetchProjects = async (token) => {
  const res = await api.get("/project", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getProjectDeployments = async (projectId, token) => {
  const res = await api.get(`/deployment/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getProjectDetails = async (projectId, token) => {
  const res = await api.get(`/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

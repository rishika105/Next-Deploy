import api from "./api/apiClient";

export const createProject = async (data, token) => {
  const res = await api.post("/project/deploy", data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

export const getProjects = async (token) => {
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


export const redeployProject = async (token, projectId) => {
  const res = await api.post(
    `/project/${projectId}/redeploy`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    });
  return res.data;
};

export const deleteProject = async (projectId, token) => {
  const res = await api.delete(`/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export const updateProjectSettings = async (projectId, data, token) => {
  const res = await api.patch(`/project/${projectId}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

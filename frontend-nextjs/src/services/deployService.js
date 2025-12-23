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

export const getDeploymentLogs = async (deploymentId, token) => {
  const res = await api.get(`/logs/${deploymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const axios = require('axios');

axios({
    method: 'GET',
    url: 'https://api.screenshotone.com/take',
    params: {
    "access_key": "-ot1TMnNyki8Rg",
    "url": "https://stripe.com",
    "format": "jpg",
    "block_ads": "true",
    "block_cookie_banners": "true",
    "block_banners_by_heuristics": "false",
    "block_trackers": "true",
    "delay": "0",
    "timeout": "60",
    "response_type": "by_format",
    "image_quality": "80"
}
})
.then(response => response)
.catch(error => {
    throw error;
});
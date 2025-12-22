import api from "./api/apiClient";

export const getWebHookStatus = async (projectId, token) => {
    const res = await api.get(`/webhook/${projectId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return res.data;
};

export const webHookSetupCICD = async (projectId, token) => {
    const res = await api.post(`/webhook/${projectId}/setup`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return res.data;
};

export const disableWebhook = async (projectId, token) => {
    const res = await api.post(`/webhook/${projectId}/disable`,
        {},
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return res.data;
};




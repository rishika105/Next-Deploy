import api from "./api/apiClient";


export async function getGitStatus(token) {
    const res = await api.get(`/github/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}

export async function getGitRepos(token) {
    const res = await api.get(`/github/repositories`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    // console.log(res.data)
    return res.data;
}

export async function disconnectGit(token) {
    await api.get(`/github/disconnect`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return;
}



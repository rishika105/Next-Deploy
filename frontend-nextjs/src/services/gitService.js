import api from "./api/apiClient";


export async function getGitStatus(token) {
    const res = await api.get(`/project/github/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}

export async function getGitRepos(token) {
    const res = await api.get(`/project/github/repositories`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    // console.log(res.data)
    return res.data;
}

export async function disconnectGit(token) {
    await api.get(`/project/github/disconnect`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return;
}



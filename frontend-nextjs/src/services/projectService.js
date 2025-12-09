import axios from "axios";

const API_URL = "http://localhost:9000/api";

export const createProject = async (token, data) => {
    try {
        const response = await axios.post(
            `${API_URL}/project`,
            data,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );
        console.log("Create project: ", response)

        return response.data;
    } catch (err) {
        console.error("API Error (createProject):", err);
        throw err;
    }
};


export const fetchProjects = async (token) => {
    try {
        const response = await axios.get(
            `${API_URL}/project`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;
    } catch (err) {
        console.error("API Error (fetch projects):", err);
        throw err;
    }
};
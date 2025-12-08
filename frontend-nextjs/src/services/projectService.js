import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";



export const fetchProjects = async () => {
    const token = gettoken();
    try {
        const response = await axios.get(`http://localhost:9000/api/project`, {
            headers: { Authorization: `Bearer ${token}` },
        });
          console.log(response.data)
        return response.data;
    } catch (error) {
        console.error("Failed to fetch deployment info:", error);
    }
};
"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

const Overview = () => {
  const [projectData, setProjectData] = useState(null);
     const { getToken } = useAuth();

  const fetchProjects = async () => {
    try {
   
      const token = await getToken();
      const response = await axios.get(`http://localhost:9000/api/project`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    //   console.log(response.data)
      setProjectData(response.data);
    } catch (error) {
      console.error("Failed to fetch deployment info:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div>
      {projectData?.map((project) => {
        <div key={project.id}>
          <h1>{project.name}</h1>
        </div>;
      })}
    </div>
  );
};

export default Overview;

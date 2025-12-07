
//check deployment status
export const checkDeploymentStatus = async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true }
    });

    if (!deployment) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    return res.status(200).json({
      success: true,
      id: deployment.id,
      status: deployment.status,
      projectSlug: deployment.project.subDomain,
      url: `http://${deployment.project.subDomain}.localhost:8000`,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt
    });
  }

  catch (error) {
    console.log("Get deployments status error: ", error);
    return res.json(500).json({ error: "Server error getting deployment status" })
  }

}


//get all deployments 
export const getDeployments = async (req, res) => {
  try {
    const id = req.auth.userId;
    if (!userId) {
      return res.status(404).json({ error: "User not found" })
    }


    const deployments = await prisma.deployment.findMany({ where: { userId: id } })

    if (deployments.entries === 0) return res.status(200).json({ message: "No deployments for this user" })

    return res.json.status(200).json({ deployments })
  }
  catch (error) {
    console.log("Get deployments error: ", error);
    return res.json(500).json({ error: "Server error getting deployments" })
  }
}


//get deployments by project id
export const getDeploymentsByProjectId = async (req, res) => {
  try {
    const id = req.auth.userId;
    const projectId = req.params.id;

    if (!userId) {
      return res.status(404).json({ error: "User not found" })
    }


    const deployments = await prisma.deployment.findMany({ where: { userId: id, projectId: projectId } })

    if (deployments.entries === 0) return res.status(200).json({ message: "No deployments of project for this user" })

    return res.json.status(200).json({ deployments })
  }
  catch (error) {
    console.log("Get deployments error: ", error);
    return res.json(500).json({ error: "Server error getting deployments of project" })
  }
}
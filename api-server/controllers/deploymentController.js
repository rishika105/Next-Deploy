import { PrismaClient } from "@prisma/client";
import { dmmfToRuntimeDataModel } from "@prisma/client/runtime/library";

const prisma = new PrismaClient()


//check deployment status
export const checkDeploymentStatus = async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { project: true }
    });

    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: "Deployment not found"
      });
    }

    //response.data
    return res.status(200).json({
      success: true,
      id: deployment.id,
      status: deployment.status,
      projectSlug: deployment.project.subDomain,
      projectName: deployment.project.name,
      projectId: deployment.projectId,
      url: `http://${deployment.project.subDomain}.localhost:8000`,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt
    });
  }

  catch (error) {
    console.log("Get deployments status error: ", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting deployment status"
    })
  }

}


//get all deployments 
export const getDeployments = async (req, res) => {
  try {
    const id = req.auth.userId;
    if (!id) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const deployments = await prisma.deployment.findMany({
      where: { userId: id },
      include: { project: true },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" }
      ]
    });

    if (deployments.length === 0)
      return res.status(200).json([]);

    return res.status(200).json({
      success: true,
      deployments
    });
  } catch (error) {
    console.log("Get deployments error: ", error);
    return res.status(500).json({
      success: false,
      message: "Server error getting deployments"
    });
  }
};


//get deployments by project id
export const getDeploymentsByProjectId = async (req, res) => {
  try {
    const id = req.auth.userId;
    const { projectId } = req.params;

    if (!id || !projectId) {
      return res.status(404).json({
        success: false,
        message: "User or project not found"
      });
    }

    const deployments = await prisma.deployment.findMany({
      where: { userId: id, projectId },
      include: { project: true },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" }
      ]
    });

    if (deployments.length === 0)
      return res.status(200).json([]);

    return res.status(200).json({
      success: true,
      deployments
    });
  } catch (error) {
    console.log("Get deployments error: ", error);
    return res.status(500).json({ success: false, message: "Server error getting deployments of project" });
  }
};

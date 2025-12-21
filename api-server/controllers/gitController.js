

import { Octokit } from "@octokit/rest";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTION
// ============================================
const getUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { githubAccessToken: true, githubUsername: true }
    });

    if (!user?.githubAccessToken) {
        throw new Error("GITHUB_NOT_CONNECTED");
    }

    return user;
};


// ============================================
// GITHUB AUTH ENDPOINTS
// ============================================

export const connectGitHub = (req, res) => {
    const userId = req.auth.userId;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_CALLBACK_URL}&scope=repo&state=${userId}`;
    res.redirect(githubAuthUrl);
};

export const githubCallback = async (req, res) => {
    const { code, state: userId } = req.query;

    try {
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code
            },
            { headers: { Accept: 'application/json' } }
        );

        const accessToken = tokenResponse.data.access_token;
        const octokit = new Octokit({ auth: accessToken });
        const { data: githubUser } = await octokit.users.getAuthenticated();

        await prisma.user.upsert({
            where: { clerkId: userId },
            update: {
                githubAccessToken: accessToken,
                githubUsername: githubUser.login
            },
            create: {
                clerkId: userId,
                githubAccessToken: accessToken,
                githubUsername: githubUser.login
            }
        });

        res.redirect(`${process.env.FRONTEND_URL}/deploy?github=connected`);
    } catch (error) {
        console.error("GitHub OAuth Error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/deploy?github=error`);
    }
};

export const disconnectGitHub = async (req, res) => {
    const userId = req.auth.userId;

    await prisma.user.update({
        where: { clerkId: userId },
        data: {
            githubAccessToken: null,
            githubUsername: null
        }
    });

    res.json({ success: true, message: "GitHub disconnected" });
};

export const getGitHubStatus = async (req, res) => {
    const userId = req.auth.userId;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { githubUsername: true, githubAccessToken: true }
    });

    res.json({
        connected: !!user?.githubUsername,
        username: user?.githubUsername
    });
};

// ============================================
//  GET USER'S GITHUB REPOSITORIES
// ============================================

export const getUserRepositories = async (req, res) => {
    const userId = req.auth.userId;

    try {
        const user = await getUser(userId);
        const octokit = new Octokit({ auth: user.githubAccessToken });

        // Get user's repos (both owned and collaborated)
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100,
            affiliation: 'owner,collaborator'
        });

        // Get already deployed projects to mark them
        const deployedProjects = await prisma.project.findMany({
            where: { userId },
            select: { gitURL: true }
        });

        const deployedUrls = new Set(deployedProjects.map(p => p.gitURL));

        const formattedRepos = repos.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            private: repo.private,
            description: repo.description,
            updatedAt: repo.updated_at,
            defaultBranch: repo.default_branch,
            isDeployed: deployedUrls.has(repo.html_url)
        }));

        res.json({
            success: true,
            repositories: formattedRepos
        });
    } catch (error) {
        if (error.message === "GITHUB_NOT_CONNECTED") {
            return res.status(403).json({
                success: false,
                message: "GitHub not connected",
                needsGitHubAuth: true
            });
        }
        console.error("Fetch repositories error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch repositories"
        });
    }
};

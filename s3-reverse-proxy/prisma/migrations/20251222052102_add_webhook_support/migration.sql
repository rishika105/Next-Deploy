-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "branch" TEXT,
ADD COLUMN     "commitAuthor" TEXT,
ADD COLUMN     "commitHash" TEXT,
ADD COLUMN     "commitMessage" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookId" TEXT;

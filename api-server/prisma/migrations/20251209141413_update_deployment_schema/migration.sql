/*
  Warnings:

  - You are about to drop the column `SUB_DOMAIN` on the `Deployment` table. All the data in the column will be lost.
  - Added the required column `project_id` to the `Deployment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Deployment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_SUB_DOMAIN_fkey";

-- AlterTable
ALTER TABLE "Deployment" DROP COLUMN "SUB_DOMAIN",
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

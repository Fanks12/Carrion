/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ArchivedJobApply` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ArchivedJobApply` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `jobApply` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArchivedJobApply" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "jobApply" DROP COLUMN "updatedAt";

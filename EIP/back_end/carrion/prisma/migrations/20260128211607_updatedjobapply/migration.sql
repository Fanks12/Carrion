-- AlterTable
ALTER TABLE "ArchivedJobApply" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "jobApply" ADD COLUMN     "updatedAt" TIMESTAMP(3);

/*
  Warnings:

  - Made the column `teamId` on table `Exercise` required. This step will fail if there are existing NULL values in that column.
  - Made the column `teamId` on table `Session` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_teamId_fkey";

-- AlterTable
ALTER TABLE "Exercise" ALTER COLUMN "teamId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "teamId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

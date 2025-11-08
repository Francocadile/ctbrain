/*
  Warnings:

  - Added the required column `teamId` to the `ClinicalEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClinicalEntry" ADD COLUMN     "teamId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ClinicalEntry_teamId_idx" ON "ClinicalEntry"("teamId");

-- AddForeignKey
ALTER TABLE "ClinicalEntry" ADD CONSTRAINT "ClinicalEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

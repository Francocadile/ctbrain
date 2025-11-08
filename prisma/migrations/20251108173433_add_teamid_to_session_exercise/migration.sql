-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE INDEX "Exercise_teamId_idx" ON "Exercise"("teamId");

-- CreateIndex
CREATE INDEX "Session_teamId_idx" ON "Session"("teamId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

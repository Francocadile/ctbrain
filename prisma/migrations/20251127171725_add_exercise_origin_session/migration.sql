-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "originSessionId" TEXT;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_originSessionId_fkey" FOREIGN KEY ("originSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

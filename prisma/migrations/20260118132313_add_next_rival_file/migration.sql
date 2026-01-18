-- CreateTable
CREATE TABLE "NextRivalFile" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextRivalFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NextRivalFile_teamId_key" ON "NextRivalFile"("teamId");

-- AddForeignKey
ALTER TABLE "NextRivalFile" ADD CONSTRAINT "NextRivalFile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

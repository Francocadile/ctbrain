-- CreateTable
CREATE TABLE "TeamVideo" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamVideo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TeamVideo"
  ADD CONSTRAINT "TeamVideo_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "TeamVideo_teamId_createdAt_idx" ON "TeamVideo"("teamId", "createdAt");

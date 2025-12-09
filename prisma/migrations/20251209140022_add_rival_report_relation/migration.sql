-- CreateTable
CREATE TABLE "RivalReport" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "rivalName" TEXT NOT NULL,
    "competition" TEXT,
    "notes" TEXT,
    "videos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RivalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_originSessionId_idx" ON "Exercise"("originSessionId");

-- AddForeignKey
ALTER TABLE "RivalReport" ADD CONSTRAINT "RivalReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

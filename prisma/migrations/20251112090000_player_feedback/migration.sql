-- Add team logo URL support
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Player feedback table for intra-team communication
CREATE TABLE "PlayerFeedback" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "subject" VARCHAR(120),
    "text" TEXT NOT NULL,
    "rating" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerFeedback_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlayerFeedback"
ADD CONSTRAINT "PlayerFeedback_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PlayerFeedback_teamId_playerId_idx" ON "PlayerFeedback" ("teamId", "playerId");
CREATE INDEX "PlayerFeedback_teamId_createdAt_idx" ON "PlayerFeedback" ("teamId", "createdAt");

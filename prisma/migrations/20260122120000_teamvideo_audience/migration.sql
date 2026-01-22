-- Additive-only migration: add audienceMode + join table for per-player audience selection

-- 1) Add enum type (if not exists). Prisma Migrate usually creates this automatically.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamVideoAudienceMode') THEN
    CREATE TYPE "TeamVideoAudienceMode" AS ENUM ('ALL', 'SELECTED');
  END IF;
END $$;

-- 2) Add column to TeamVideo
ALTER TABLE "TeamVideo"
ADD COLUMN IF NOT EXISTS "audienceMode" "TeamVideoAudienceMode" NOT NULL DEFAULT 'ALL';

-- 3) Create join table
CREATE TABLE IF NOT EXISTS "TeamVideoAudience" (
  "id" TEXT NOT NULL,
  "teamVideoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamVideoAudience_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (additive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TeamVideoAudience_teamVideoId_fkey'
  ) THEN
    ALTER TABLE "TeamVideoAudience"
    ADD CONSTRAINT "TeamVideoAudience_teamVideoId_fkey"
    FOREIGN KEY ("teamVideoId") REFERENCES "TeamVideo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TeamVideoAudience_userId_fkey'
  ) THEN
    ALTER TABLE "TeamVideoAudience"
    ADD CONSTRAINT "TeamVideoAudience_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes & uniqueness (additive)
CREATE UNIQUE INDEX IF NOT EXISTS "TeamVideoAudience_teamVideoId_userId_key" ON "TeamVideoAudience"("teamVideoId", "userId");
CREATE INDEX IF NOT EXISTS "TeamVideoAudience_teamVideoId_idx" ON "TeamVideoAudience"("teamVideoId");
CREATE INDEX IF NOT EXISTS "TeamVideoAudience_userId_idx" ON "TeamVideoAudience"("userId");

-- Add teamId to Rival and scope by team
ALTER TABLE "Rival" ADD COLUMN "teamId" TEXT;

-- Ensure at least one team exists to backfill teamId
INSERT INTO "Team" ("id", "name", "createdAt", "updatedAt")
SELECT 'legacy-default-team', 'Legacy Team', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Team");

-- Backfill existing rivals with the first available team
UPDATE "Rival"
SET "teamId" = (
  SELECT "id" FROM "Team" ORDER BY "createdAt" LIMIT 1
)
WHERE "teamId" IS NULL;

-- Enforce not-null and add FK
ALTER TABLE "Rival"
ALTER COLUMN "teamId" SET NOT NULL;

ALTER TABLE "Rival"
ADD CONSTRAINT "Rival_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old unique constraint on name and add scoped unique index
DROP INDEX IF EXISTS "Rival_name_key";
CREATE UNIQUE INDEX "Rival_teamId_name_key" ON "Rival" ("teamId", "name");

-- Add teamId index for faster filtering
CREATE INDEX IF NOT EXISTS "Rival_teamId_idx" ON "Rival" ("teamId");

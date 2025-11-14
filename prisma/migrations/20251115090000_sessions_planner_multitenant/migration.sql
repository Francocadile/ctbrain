-- Add team scoping columns
ALTER TABLE "Session" ADD COLUMN     "teamId" TEXT;
ALTER TABLE "Place" ADD COLUMN       "teamId" TEXT;
ALTER TABLE "PlannerPrefs" ADD COLUMN "teamId" TEXT;

-- Backfill using each user's oldest team membership
WITH user_main_team AS (
  SELECT DISTINCT ON ("userId") "userId", "teamId"
  FROM "UserTeam"
  ORDER BY "userId", "createdAt" ASC
)
UPDATE "Session" s
SET "teamId" = umt."teamId"
FROM user_main_team umt
WHERE s."teamId" IS NULL AND s."createdBy" = umt."userId";

WITH user_main_team AS (
  SELECT DISTINCT ON ("userId") "userId", "teamId"
  FROM "UserTeam"
  ORDER BY "userId", "createdAt" ASC
)
UPDATE "PlannerPrefs" pp
SET "teamId" = umt."teamId"
FROM user_main_team umt
WHERE pp."teamId" IS NULL AND pp."userId" = umt."userId";

-- Fallback to the earliest team if anything remains without team
WITH primary_team AS (
  SELECT "id"
  FROM "Team"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "Place"
SET "teamId" = (SELECT "id" FROM primary_team)
WHERE "teamId" IS NULL;

WITH primary_team AS (
  SELECT "id"
  FROM "Team"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "Session"
SET "teamId" = (SELECT "id" FROM primary_team)
WHERE "teamId" IS NULL;

WITH primary_team AS (
  SELECT "id"
  FROM "Team"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "PlannerPrefs"
SET "teamId" = (SELECT "id" FROM primary_team)
WHERE "teamId" IS NULL;

-- Enforce not-null + foreign keys
ALTER TABLE "Session"
  ALTER COLUMN "teamId" SET NOT NULL,
  ADD CONSTRAINT "Session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Place"
  ALTER COLUMN "teamId" SET NOT NULL,
  ADD CONSTRAINT "Place_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlannerPrefs"
  ALTER COLUMN "teamId" SET NOT NULL,
  ADD CONSTRAINT "PlannerPrefs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Replace unique/index definitions
DROP INDEX IF EXISTS "Place_name_key";
CREATE UNIQUE INDEX "Place_teamId_name_key" ON "Place" ("teamId", "name");
CREATE INDEX "Place_teamId_idx" ON "Place" ("teamId");

DROP INDEX IF EXISTS "PlannerPrefs_userId_key";
CREATE UNIQUE INDEX "PlannerPrefs_userId_teamId_key" ON "PlannerPrefs" ("userId", "teamId");
CREATE INDEX "PlannerPrefs_teamId_idx" ON "PlannerPrefs" ("teamId");

CREATE INDEX IF NOT EXISTS "Session_teamId_idx" ON "Session" ("teamId");
CREATE INDEX IF NOT EXISTS "Session_teamId_date_idx" ON "Session" ("teamId", "date");

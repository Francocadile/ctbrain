/*
  PlannerPrefs team-scoped migration

  Goal:
  - Replace per-(userId, teamId) prefs with per-team prefs.
  - Keep existing data by collapsing rows for the same teamId.

  Strategy:
  1) Add new columns that will become the canonical team-scoped fields.
  2) Copy one row per team into those new columns (arbitrary pick: newest updatedAt).
  3) Drop the old constraints/columns.
  4) Enforce uniqueness by teamId.

  Note: This migration keeps one prefs row per team. If multiple users had different
  prefs for the same team, the newest wins.
*/

-- 1) Add canonical columns
ALTER TABLE "PlannerPrefs"
  ADD COLUMN IF NOT EXISTS "rowLabels_team" JSONB,
  ADD COLUMN IF NOT EXISTS "contentRowIds_team" JSONB,
  ADD COLUMN IF NOT EXISTS "metaRowIds_team" JSONB;

-- 2) Collapse (newest per team)
WITH ranked AS (
  SELECT
    "id",
    "teamId",
    "rowLabels",
    "contentRowIds",
    "metaRowIds",
    ROW_NUMBER() OVER (
      PARTITION BY "teamId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM "PlannerPrefs"
)
UPDATE "PlannerPrefs" p
SET
  "rowLabels_team" = r."rowLabels",
  "contentRowIds_team" = r."contentRowIds",
  "metaRowIds_team" = r."metaRowIds"
FROM ranked r
WHERE p."id" = r."id" AND r.rn = 1;

-- 3) Delete duplicate rows so we can enforce unique(teamId)
DELETE FROM "PlannerPrefs" p
USING "PlannerPrefs" p2
WHERE p."teamId" = p2."teamId"
  AND p."id" <> p2."id"
  AND p."updatedAt" < p2."updatedAt";

-- 4) Drop old unique (userId, teamId) and old userId column
DO $$
BEGIN
  -- drop the known prisma constraint name if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlannerPrefs_userId_teamId_key'
  ) THEN
    ALTER TABLE "PlannerPrefs" DROP CONSTRAINT "PlannerPrefs_userId_teamId_key";
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END $$;

ALTER TABLE "PlannerPrefs"
  DROP COLUMN IF EXISTS "userId";

-- 5) Replace old columns with canonical ones
ALTER TABLE "PlannerPrefs"
  DROP COLUMN IF EXISTS "rowLabels",
  DROP COLUMN IF EXISTS "contentRowIds",
  DROP COLUMN IF EXISTS "metaRowIds";

ALTER TABLE "PlannerPrefs"
  RENAME COLUMN "rowLabels_team" TO "rowLabels";
ALTER TABLE "PlannerPrefs"
  RENAME COLUMN "contentRowIds_team" TO "contentRowIds";
ALTER TABLE "PlannerPrefs"
  RENAME COLUMN "metaRowIds_team" TO "metaRowIds";

-- 6) Enforce unique(teamId)
ALTER TABLE "PlannerPrefs"
  ADD CONSTRAINT "PlannerPrefs_teamId_key" UNIQUE ("teamId");

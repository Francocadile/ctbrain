-- Add slug and isActive columns to Team
ALTER TABLE "Team" ADD COLUMN "slug" TEXT;
ALTER TABLE "Team" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Derive slugs from existing names (fallback to id prefix when empty)
UPDATE "Team" AS t
SET "slug" = CASE
  WHEN derived.slug_candidate = '' THEN CONCAT('team-', SUBSTRING(t."id" FROM 1 FOR 8))
  ELSE derived.slug_candidate
END
FROM (
  SELECT id, LOWER(REGEXP_REPLACE(name, '[^A-Za-z0-9]+', '-', 'g')) AS slug_candidate
  FROM "Team"
) AS derived
WHERE derived.id = t."id";

ALTER TABLE "Team"
  ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

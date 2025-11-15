-- Add team scoping to scouting categories and players
ALTER TABLE "ScoutingCategory" ADD COLUMN "teamId" TEXT;
ALTER TABLE "ScoutingPlayer" ADD COLUMN "teamId" TEXT;

-- Drop old unique constraints and indexes
DROP INDEX IF EXISTS "ScoutingCategory_slug_key";
DROP INDEX IF EXISTS "ScoutingCategory_nombre_key";
DROP INDEX IF EXISTS "ScoutingCategory_orden_idx";
DROP INDEX IF EXISTS "ScoutingPlayer_categoriaId_idx";
DROP INDEX IF EXISTS "ScoutingPlayer_estado_idx";
DROP INDEX IF EXISTS "ScoutingPlayer_fullName_idx";

-- Create new scoped indexes
CREATE UNIQUE INDEX "ScoutingCategory_teamId_slug_key" ON "ScoutingCategory"("teamId", "slug");
CREATE UNIQUE INDEX "ScoutingCategory_teamId_nombre_key" ON "ScoutingCategory"("teamId", "nombre");
CREATE INDEX "ScoutingCategory_teamId_orden_idx" ON "ScoutingCategory"("teamId", "orden");
CREATE INDEX "ScoutingPlayer_teamId_idx" ON "ScoutingPlayer"("teamId");
CREATE INDEX "ScoutingPlayer_teamId_categoriaId_idx" ON "ScoutingPlayer"("teamId", "categoriaId");
CREATE INDEX "ScoutingPlayer_teamId_estado_idx" ON "ScoutingPlayer"("teamId", "estado");
CREATE INDEX "ScoutingPlayer_teamId_fullName_idx" ON "ScoutingPlayer"("teamId", "fullName");

-- Foreign keys (nullable for now to allow backfill)
ALTER TABLE "ScoutingCategory"
  ADD CONSTRAINT "ScoutingCategory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoutingPlayer"
  ADD CONSTRAINT "ScoutingPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

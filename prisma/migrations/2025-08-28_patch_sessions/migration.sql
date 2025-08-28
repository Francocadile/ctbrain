-- Enums
DO $$ BEGIN
  CREATE TYPE "SessionType" AS ENUM ('GENERAL','FUERZA','TACTICA','AEROBICO','RECUPERACION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabla Session
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "SessionType" NOT NULL DEFAULT 'GENERAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "createdBy" TEXT NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS "Session_date_idx" ON "Session" ("date");
CREATE INDEX IF NOT EXISTS "Session_type_idx" ON "Session" ("type");
CREATE INDEX IF NOT EXISTS "Session_createdBy_idx" ON "Session" ("createdBy");

-- FK
ALTER TABLE "Session"
ADD CONSTRAINT IF NOT EXISTS "Session_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger updatedAt
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_session ON "Session";
CREATE TRIGGER set_timestamp_on_session
BEFORE UPDATE ON "Session"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

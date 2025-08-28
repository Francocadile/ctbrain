-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('PARTIDO','TACTICO','FUERZA','RECUPERACION','EVALUACION','LIBRE');

-- CreateTable
CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "date" TIMESTAMP(3) NOT NULL,
  "start" TIMESTAMP(3),
  "end" TIMESTAMP(3),
  "title" TEXT NOT NULL,
  "type" "SessionType" NOT NULL,
  "notes" TEXT,
  "rpe" INTEGER,
  "load" INTEGER,
  "microcycle" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "createdById" TEXT NOT NULL
);

-- Indexes
CREATE INDEX "Session_date_idx" ON "Session" ("date");
CREATE INDEX "Session_type_idx" ON "Session" ("type");
CREATE INDEX "Session_createdById_idx" ON "Session" ("createdById");

-- FK
ALTER TABLE "Session"
ADD CONSTRAINT "Session_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger para updatedAt (opcional Neon)
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

-- Asegura que el enum de DB tenga todos los valores que usamos en Prisma.
-- Si "SessionType" ya existe, añadimos valores faltantes sin romper los existentes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'SessionType') THEN
    CREATE TYPE "SessionType" AS ENUM (
      'GENERAL','FUERZA','TACTICA','AEROBICO','RECUPERACION',
      'PARTIDO','TACTICO','EVALUACION','LIBRE'
    );
  END IF;
END$$;

-- Agregar valores que falten (si el TYPE ya existía)
DO $$
DECLARE
  v TEXT;
BEGIN
  FOREACH v IN ARRAY ARRAY['GENERAL','FUERZA','TACTICA','AEROBICO','RECUPERACION','PARTIDO','TACTICO','EVALUACION','LIBRE']
  LOOP
    BEGIN
      EXECUTE format('ALTER TYPE "SessionType" ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION WHEN others THEN
      -- ignorar errores si ya existe o si el valor está en otra posición
      NULL;
    END;
  END LOOP;
END$$;

-- Asegurar columnas/tabla Session (si venías de un esquema anterior distinto)
-- (Estas operaciones son idempotentes cuando la estructura ya existe)

-- Trigger updatedAt para Session (si usás Neon/Postgres)
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

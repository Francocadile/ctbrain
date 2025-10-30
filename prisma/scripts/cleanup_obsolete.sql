-- Script para limpiar la base de datos de tipos y tablas obsoletos
-- Ejecuta esto en tu base de datos PostgreSQL antes de correr las migraciones Prisma

DROP TABLE IF EXISTS "TrainingSession" CASCADE;
DROP TYPE IF EXISTS "SessionType_old" CASCADE;

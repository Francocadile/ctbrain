-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'CT', 'MEDICO', 'JUGADOR', 'DIRECTIVO');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('GENERAL', 'FUERZA', 'TACTICA', 'AEROBICO', 'RECUPERACION');

-- CreateEnum
CREATE TYPE "ClinicalStatus" AS ENUM ('BAJA', 'REINTEGRO', 'LIMITADA', 'ALTA');

-- CreateEnum
CREATE TYPE "LeaveStage" AS ENUM ('PARTIDO', 'ENTRENAMIENTO', 'EXTRADEPORTIVO');

-- CreateEnum
CREATE TYPE "LeaveKind" AS ENUM ('LESION', 'ENFERMEDAD');

-- CreateEnum
CREATE TYPE "Laterality" AS ENUM ('IZQ', 'DER', 'BILATERAL', 'NA');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LEVE', 'MODERADA', 'SEVERA');

-- CreateEnum
CREATE TYPE "Mechanism" AS ENUM ('SOBRECARGA', 'IMPACTO', 'TORSION', 'ESTIRAMIENTO', 'RECIDIVA', 'OTRO');

-- CreateEnum
CREATE TYPE "SystemAffected" AS ENUM ('RESPIRATORIO', 'GASTROINTESTINAL', 'OTORRINO', 'DERMATOLOGICO', 'GENERAL', 'OTRO');

-- CreateEnum
CREATE TYPE "IllAptitude" AS ENUM ('SOLO_GIMNASIO', 'AEROBICO_SUAVE', 'CHARLAS_TACTICO', 'NINGUNO');

-- CreateEnum
CREATE TYPE "ScoutingStatus" AS ENUM ('ACTIVO', 'WATCHLIST', 'DESCARTADO');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'JUGADOR',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rival" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coach" TEXT,
    "baseSystem" TEXT,
    "nextMatchDate" TIMESTAMP(3),
    "nextMatchCompetition" TEXT,
    "planCharlaUrl" TEXT,
    "planReport" JSONB DEFAULT '{}',
    "planVideos" JSONB DEFAULT '[]',
    "planStats" JSONB DEFAULT '{}',
    "planNotes" JSONB DEFAULT '{}',
    "planVisibility" JSONB DEFAULT '{}',
    "planSquad" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseKind" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseKind_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kindId" TEXT,
    "space" TEXT,
    "players" TEXT,
    "duration" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RPEEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "session" INTEGER NOT NULL DEFAULT 1,
    "sessionLabel" TEXT,
    "sessionUid" TEXT,
    "rpe" INTEGER NOT NULL,
    "duration" INTEGER,
    "load" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RPEEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellnessEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sleepQuality" INTEGER NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "fatigue" INTEGER NOT NULL,
    "muscleSoreness" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "mood" INTEGER NOT NULL,
    "comment" TEXT,
    "total" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerPrefs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rowLabels" JSONB NOT NULL DEFAULT '{}',
    "places" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerPrefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ClinicalStatus" NOT NULL,
    "leaveStage" "LeaveStage",
    "leaveKind" "LeaveKind",
    "diagnosis" TEXT,
    "bodyPart" TEXT,
    "laterality" "Laterality",
    "mechanism" "Mechanism",
    "severity" "Severity",
    "illSystem" "SystemAffected",
    "illSymptoms" TEXT,
    "illContagious" BOOLEAN,
    "illIsolationDays" INTEGER,
    "illAptitude" "IllAptitude",
    "feverMax" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "daysPlanned" INTEGER,
    "expectedReturn" TIMESTAMP(3),
    "expectedReturnManual" BOOLEAN DEFAULT false,
    "capMinutes" INTEGER,
    "noSprint" BOOLEAN NOT NULL DEFAULT false,
    "noChangeOfDirection" BOOLEAN NOT NULL DEFAULT false,
    "gymOnly" BOOLEAN NOT NULL DEFAULT false,
    "noContact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "medSignature" TEXT,
    "protocolObjectives" TEXT,
    "protocolTasks" TEXT,
    "protocolControls" TEXT,
    "protocolCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutingCategory" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutingPlayer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "positions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "club" TEXT,
    "estado" "ScoutingStatus" NOT NULL DEFAULT 'ACTIVO',
    "categoriaId" TEXT,
    "agentName" TEXT,
    "agentPhone" TEXT,
    "agentEmail" TEXT,
    "playerPhone" TEXT,
    "playerEmail" TEXT,
    "instagram" TEXT,
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "rating" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_date_idx" ON "Session"("date");

-- CreateIndex
CREATE INDEX "Session_type_idx" ON "Session"("type");

-- CreateIndex
CREATE INDEX "Session_createdBy_idx" ON "Session"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Rival_name_key" ON "Rival"("name");

-- CreateIndex
CREATE INDEX "Rival_nextMatchDate_idx" ON "Rival"("nextMatchDate");

-- CreateIndex
CREATE UNIQUE INDEX "Place_name_key" ON "Place"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseKind_name_key" ON "ExerciseKind"("name");

-- CreateIndex
CREATE INDEX "Exercise_userId_createdAt_idx" ON "Exercise"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Exercise_userId_title_idx" ON "Exercise"("userId", "title");

-- CreateIndex
CREATE INDEX "Exercise_kindId_idx" ON "Exercise"("kindId");

-- CreateIndex
CREATE INDEX "RPEEntry_date_idx" ON "RPEEntry"("date");

-- CreateIndex
CREATE INDEX "RPEEntry_userId_date_session_idx" ON "RPEEntry"("userId", "date", "session");

-- CreateIndex
CREATE INDEX "RPEEntry_date_session_idx" ON "RPEEntry"("date", "session");

-- CreateIndex
CREATE INDEX "RPEEntry_sessionUid_idx" ON "RPEEntry"("sessionUid");

-- CreateIndex
CREATE UNIQUE INDEX "RPEEntry_userId_date_session_key" ON "RPEEntry"("userId", "date", "session");

-- CreateIndex
CREATE INDEX "WellnessEntry_date_idx" ON "WellnessEntry"("date");

-- CreateIndex
CREATE INDEX "WellnessEntry_userId_date_idx" ON "WellnessEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WellnessEntry_userId_date_key" ON "WellnessEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerPrefs_userId_key" ON "PlannerPrefs"("userId");

-- CreateIndex
CREATE INDEX "ClinicalEntry_date_idx" ON "ClinicalEntry"("date");

-- CreateIndex
CREATE INDEX "ClinicalEntry_status_date_idx" ON "ClinicalEntry"("status", "date");

-- CreateIndex
CREATE INDEX "ClinicalEntry_leaveKind_idx" ON "ClinicalEntry"("leaveKind");

-- CreateIndex
CREATE INDEX "ClinicalEntry_bodyPart_idx" ON "ClinicalEntry"("bodyPart");

-- CreateIndex
CREATE INDEX "ClinicalEntry_userId_date_idx" ON "ClinicalEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalEntry_userId_date_key" ON "ClinicalEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingCategory_slug_key" ON "ScoutingCategory"("slug");

-- CreateIndex
CREATE INDEX "ScoutingCategory_orden_idx" ON "ScoutingCategory"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingCategory_nombre_key" ON "ScoutingCategory"("nombre");

-- CreateIndex
CREATE INDEX "ScoutingPlayer_categoriaId_idx" ON "ScoutingPlayer"("categoriaId");

-- CreateIndex
CREATE INDEX "ScoutingPlayer_estado_idx" ON "ScoutingPlayer"("estado");

-- CreateIndex
CREATE INDEX "ScoutingPlayer_fullName_idx" ON "ScoutingPlayer"("fullName");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "ExerciseKind"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RPEEntry" ADD CONSTRAINT "RPEEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellnessEntry" ADD CONSTRAINT "WellnessEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerPrefs" ADD CONSTRAINT "PlannerPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalEntry" ADD CONSTRAINT "ClinicalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutingPlayer" ADD CONSTRAINT "ScoutingPlayer_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "ScoutingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

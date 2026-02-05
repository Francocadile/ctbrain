-- CreateTable
CREATE TABLE "RoutineProgram" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineProgramPhase" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineProgramPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineProgramPhaseRoutine" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineProgramPhaseRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineProgram_teamId_idx" ON "RoutineProgram"("teamId");

-- CreateIndex
CREATE INDEX "RoutineProgramPhase_programId_idx" ON "RoutineProgramPhase"("programId");

-- CreateIndex
CREATE INDEX "RoutineProgramPhaseRoutine_phaseId_idx" ON "RoutineProgramPhaseRoutine"("phaseId");

-- CreateIndex
CREATE INDEX "RoutineProgramPhaseRoutine_routineId_idx" ON "RoutineProgramPhaseRoutine"("routineId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "RoutineProgramPhaseRoutine_phaseId_routineId_key" ON "RoutineProgramPhaseRoutine"("phaseId", "routineId");

-- AddForeignKey
ALTER TABLE "RoutineProgram" ADD CONSTRAINT "RoutineProgram_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineProgramPhase" ADD CONSTRAINT "RoutineProgramPhase_programId_fkey" FOREIGN KEY ("programId") REFERENCES "RoutineProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineProgramPhaseRoutine" ADD CONSTRAINT "RoutineProgramPhaseRoutine_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "RoutineProgramPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

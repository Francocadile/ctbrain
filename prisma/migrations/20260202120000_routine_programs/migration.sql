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
CREATE TABLE "RoutineProgramDay" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "label" TEXT,
    "routineId" TEXT NOT NULL,

    CONSTRAINT "RoutineProgramDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineProgram_teamId_idx" ON "RoutineProgram"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineProgramDay_programId_dayIndex_key" ON "RoutineProgramDay"("programId", "dayIndex");

-- CreateIndex
CREATE INDEX "RoutineProgramDay_routineId_idx" ON "RoutineProgramDay"("routineId");

-- AddForeignKey
ALTER TABLE "RoutineProgram" ADD CONSTRAINT "RoutineProgram_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineProgramDay" ADD CONSTRAINT "RoutineProgramDay_programId_fkey" FOREIGN KEY ("programId") REFERENCES "RoutineProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineProgramDay" ADD CONSTRAINT "RoutineProgramDay_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

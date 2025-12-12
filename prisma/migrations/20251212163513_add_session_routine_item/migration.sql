-- CreateTable
CREATE TABLE "SessionRoutineItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "routineId" TEXT,
    "routineItemId" TEXT,
    "blockName" TEXT,
    "blockType" TEXT,
    "title" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "load" TEXT,
    "tempo" TEXT,
    "rest" TEXT,
    "notes" TEXT,
    "athleteNotes" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionRoutineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionRoutineItem_sessionId_idx" ON "SessionRoutineItem"("sessionId");

-- CreateIndex
CREATE INDEX "SessionRoutineItem_routineId_idx" ON "SessionRoutineItem"("routineId");

-- AddForeignKey
ALTER TABLE "SessionRoutineItem" ADD CONSTRAINT "SessionRoutineItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Routine
CREATE TABLE "Routine" (
    "id"         TEXT         NOT NULL,
    "teamId"     TEXT         NOT NULL,
    "title"      TEXT         NOT NULL,
    "description" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoutineItem
CREATE TABLE "RoutineItem" (
    "id"         TEXT         NOT NULL,
    "routineId"  TEXT         NOT NULL,
    "title"      TEXT         NOT NULL,
    "description" TEXT,
    "order"      INTEGER      NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable SessionRoutine
CREATE TABLE "SessionRoutine" (
    "id"         TEXT         NOT NULL,
    "sessionId"  TEXT         NOT NULL,
    "routineId"  TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRoutine_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Routine_teamId_idx" ON "Routine"("teamId");
CREATE INDEX "RoutineItem_routineId_idx" ON "RoutineItem"("routineId");

-- Unique constraint for SessionRoutine
CREATE UNIQUE INDEX "SessionRoutine_sessionId_routineId_key"
ON "SessionRoutine"("sessionId", "routineId");

-- Foreign keys
ALTER TABLE "Routine"
ADD CONSTRAINT "Routine_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoutineItem"
ADD CONSTRAINT "RoutineItem_routineId_fkey"
FOREIGN KEY ("routineId") REFERENCES "Routine"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionRoutine"
ADD CONSTRAINT "SessionRoutine_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionRoutine"
ADD CONSTRAINT "SessionRoutine_routineId_fkey"
FOREIGN KEY ("routineId") REFERENCES "Routine"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

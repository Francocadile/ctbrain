-- CreateEnum
CREATE TYPE "RoutineShareMode" AS ENUM ('STAFF_ONLY', 'ALL_PLAYERS', 'SELECTED_PLAYERS');

-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "shareMode" "RoutineShareMode" NOT NULL DEFAULT 'STAFF_ONLY';

-- CreateTable
CREATE TABLE "RoutinePlayerShare" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutinePlayerShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutinePlayerShare_routineId_playerId_key" ON "RoutinePlayerShare"("routineId", "playerId");

-- AddForeignKey
ALTER TABLE "RoutinePlayerShare" ADD CONSTRAINT "RoutinePlayerShare_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutinePlayerShare" ADD CONSTRAINT "RoutinePlayerShare_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `description` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `kindId` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `players` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `space` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Exercise` table. All the data in the column will be lost.
  - Added the required column `name` to the `Exercise` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoutineVisibility" AS ENUM ('STAFF_ONLY', 'PLAYER_VISIBLE');

-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_kindId_fkey";

-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_userId_fkey";

-- DropIndex
DROP INDEX "Exercise_kindId_idx";

-- DropIndex
DROP INDEX "Exercise_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Exercise_userId_title_idx";

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "description",
DROP COLUMN "duration",
DROP COLUMN "imageUrl",
DROP COLUMN "kindId",
DROP COLUMN "players",
DROP COLUMN "space",
DROP COLUMN "tags",
DROP COLUMN "title",
DROP COLUMN "userId",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "Routine" ADD COLUMN     "goal" TEXT,
ADD COLUMN     "notesForAthlete" TEXT,
ADD COLUMN     "visibility" "RoutineVisibility" DEFAULT 'STAFF_ONLY',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RoutineItem" ADD COLUMN     "athleteNotes" TEXT,
ADD COLUMN     "blockId" TEXT,
ADD COLUMN     "exerciseId" TEXT,
ADD COLUMN     "exerciseName" TEXT,
ADD COLUMN     "load" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reps" INTEGER,
ADD COLUMN     "rest" TEXT,
ADD COLUMN     "sets" INTEGER,
ADD COLUMN     "tempo" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SessionRoutine" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RoutineBlock" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "RoutineBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineBlock_routineId_idx" ON "RoutineBlock"("routineId");

-- CreateIndex
CREATE INDEX "RoutineItem_blockId_idx" ON "RoutineItem"("blockId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineBlock" ADD CONSTRAINT "RoutineBlock_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineItem" ADD CONSTRAINT "RoutineItem_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "RoutineBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineItem" ADD CONSTRAINT "RoutineItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `nextMatchCompetition` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `nextMatchDate` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `planNotes` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `planReport` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `planSquad` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `planStats` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `planVideos` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `planVisibility` on the `Rival` table. All the data in the column will be lost.
  - You are about to drop the column `categoriaId` on the `ScoutingPlayer` table. All the data in the column will be lost.
  - You are about to drop the `Exercise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExerciseKind` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Place` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Place` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Place` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_kindId_fkey";

-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_userId_fkey";

-- DropForeignKey
ALTER TABLE "ScoutingPlayer" DROP CONSTRAINT "ScoutingPlayer_categoriaId_fkey";

-- DropIndex
DROP INDEX "Place_name_key";

-- DropIndex
DROP INDEX "Rival_nextMatchDate_idx";

-- DropIndex
DROP INDEX "ScoutingPlayer_categoriaId_idx";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "description" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kindId" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "players" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'JUGADOR',
ADD COLUMN     "space" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Rival" DROP COLUMN "nextMatchCompetition",
DROP COLUMN "nextMatchDate",
DROP COLUMN "planNotes",
DROP COLUMN "planReport",
DROP COLUMN "planSquad",
DROP COLUMN "planStats",
DROP COLUMN "planVideos",
DROP COLUMN "planVisibility";

-- AlterTable
ALTER TABLE "ScoutingPlayer" DROP COLUMN "categoriaId";

-- DropTable
DROP TABLE "Exercise";

-- DropTable
DROP TABLE "ExerciseKind";

-- CreateIndex
CREATE UNIQUE INDEX "Place_email_key" ON "Place"("email");

-- CreateIndex
CREATE INDEX "Place_kindId_idx" ON "Place"("kindId");

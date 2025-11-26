-- CreateEnum
CREATE TYPE "ExerciseUsage" AS ENUM ('ROUTINE', 'SESSION');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "usage" "ExerciseUsage" NOT NULL DEFAULT 'ROUTINE';

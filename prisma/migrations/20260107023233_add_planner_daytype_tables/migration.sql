/*
  Warnings:

  - You are about to drop the `BlockCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlockPlanBlock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlockPlanDay` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlockPlanWeek` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BlockCategory" DROP CONSTRAINT "BlockCategory_teamId_fkey";

-- DropForeignKey
ALTER TABLE "BlockPlanBlock" DROP CONSTRAINT "BlockPlanBlock_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "BlockPlanBlock" DROP CONSTRAINT "BlockPlanBlock_dayId_fkey";

-- DropForeignKey
ALTER TABLE "BlockPlanDay" DROP CONSTRAINT "BlockPlanDay_weekId_fkey";

-- DropForeignKey
ALTER TABLE "BlockPlanWeek" DROP CONSTRAINT "BlockPlanWeek_createdById_fkey";

-- DropForeignKey
ALTER TABLE "BlockPlanWeek" DROP CONSTRAINT "BlockPlanWeek_teamId_fkey";

-- DropTable
DROP TABLE "BlockCategory";

-- DropTable
DROP TABLE "BlockPlanBlock";

-- DropTable
DROP TABLE "BlockPlanDay";

-- DropTable
DROP TABLE "BlockPlanWeek";

-- CreateTable
CREATE TABLE "PlannerDayType" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlannerDayType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerDayTypeAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ymd" TEXT NOT NULL,
    "turn" TEXT NOT NULL,
    "dayTypeKey" TEXT NOT NULL,

    CONSTRAINT "PlannerDayTypeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerDayType_teamId_order_idx" ON "PlannerDayType"("teamId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerDayType_teamId_key_key" ON "PlannerDayType"("teamId", "key");

-- CreateIndex
CREATE INDEX "PlannerDayTypeAssignment_teamId_ymd_idx" ON "PlannerDayTypeAssignment"("teamId", "ymd");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerDayTypeAssignment_teamId_ymd_turn_key" ON "PlannerDayTypeAssignment"("teamId", "ymd", "turn");

-- AddForeignKey
ALTER TABLE "PlannerDayType" ADD CONSTRAINT "PlannerDayType_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerDayTypeAssignment" ADD CONSTRAINT "PlannerDayTypeAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

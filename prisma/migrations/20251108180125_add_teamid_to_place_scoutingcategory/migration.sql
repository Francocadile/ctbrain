/*
  Warnings:

  - A unique constraint covering the columns `[name,teamId]` on the table `Place` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre,teamId]` on the table `ScoutingCategory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamId` to the `Place` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `ScoutingCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Place_name_key";

-- DropIndex
DROP INDEX "ScoutingCategory_nombre_key";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScoutingCategory" ADD COLUMN     "teamId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Place_name_teamId_key" ON "Place"("name", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingCategory_nombre_teamId_key" ON "ScoutingCategory"("nombre", "teamId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutingCategory" ADD CONSTRAINT "ScoutingCategory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BlockPlanWeek" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockPlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockPlanDay" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockCategory" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockPlanBlock" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "intensity" TEXT,
    "linkedSessionId" TEXT,
    "linkedRoutineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockPlanBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockPlanWeek_teamId_weekStart_idx" ON "BlockPlanWeek"("teamId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "BlockPlanWeek_teamId_weekStart_key" ON "BlockPlanWeek"("teamId", "weekStart");

-- CreateIndex
CREATE INDEX "BlockPlanDay_date_idx" ON "BlockPlanDay"("date");

-- CreateIndex
CREATE INDEX "BlockPlanDay_weekId_date_idx" ON "BlockPlanDay"("weekId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BlockPlanDay_weekId_date_key" ON "BlockPlanDay"("weekId", "date");

-- CreateIndex
CREATE INDEX "BlockCategory_teamId_order_idx" ON "BlockCategory"("teamId", "order");

-- CreateIndex
CREATE INDEX "BlockCategory_teamId_isActive_idx" ON "BlockCategory"("teamId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlockCategory_teamId_key_key" ON "BlockCategory"("teamId", "key");

-- CreateIndex
CREATE INDEX "BlockPlanBlock_dayId_order_idx" ON "BlockPlanBlock"("dayId", "order");

-- CreateIndex
CREATE INDEX "BlockPlanBlock_categoryId_idx" ON "BlockPlanBlock"("categoryId");

-- AddForeignKey
ALTER TABLE "BlockPlanWeek" ADD CONSTRAINT "BlockPlanWeek_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPlanWeek" ADD CONSTRAINT "BlockPlanWeek_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPlanDay" ADD CONSTRAINT "BlockPlanDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "BlockPlanWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockCategory" ADD CONSTRAINT "BlockCategory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPlanBlock" ADD CONSTRAINT "BlockPlanBlock_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "BlockPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockPlanBlock" ADD CONSTRAINT "BlockPlanBlock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlockCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

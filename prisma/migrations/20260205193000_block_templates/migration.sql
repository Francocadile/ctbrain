-- CreateTable
CREATE TABLE "BlockTemplate" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "load" TEXT,
    "tempo" TEXT,
    "rest" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockTemplate_teamId_idx" ON "BlockTemplate"("teamId");

-- CreateIndex
CREATE INDEX "BlockTemplateItem_templateId_idx" ON "BlockTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "BlockTemplateItem_exerciseId_idx" ON "BlockTemplateItem"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockTemplateItem_templateId_exerciseId_order_key" ON "BlockTemplateItem"("templateId", "exerciseId", "order");

-- AddForeignKey
ALTER TABLE "BlockTemplate" ADD CONSTRAINT "BlockTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockTemplateItem" ADD CONSTRAINT "BlockTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BlockTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

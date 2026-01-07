-- CreateEnum
CREATE TYPE "ProtocolStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "ProtocolBlockType" AS ENUM ('GYM', 'FIELD', 'POOL', 'THERAPY', 'MOBILITY', 'SUPPLEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Protocol" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clinicalEntryId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT,
    "injuryContext" TEXT,
    "status" "ProtocolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolStage" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "order" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ProtocolStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtocolBlock" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ProtocolBlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "intensity" TEXT,
    "volume" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProtocolBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Protocol_teamId_idx" ON "Protocol"("teamId");

-- CreateIndex
CREATE INDEX "Protocol_playerId_idx" ON "Protocol"("playerId");

-- CreateIndex
CREATE INDEX "Protocol_clinicalEntryId_idx" ON "Protocol"("clinicalEntryId");

-- CreateIndex
CREATE INDEX "ProtocolStage_protocolId_order_idx" ON "ProtocolStage"("protocolId", "order");

-- CreateIndex
CREATE INDEX "ProtocolStage_date_idx" ON "ProtocolStage"("date");

-- CreateIndex
CREATE INDEX "ProtocolBlock_stageId_order_idx" ON "ProtocolBlock"("stageId", "order");

-- AddForeignKey
ALTER TABLE "Protocol" ADD CONSTRAINT "Protocol_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocol" ADD CONSTRAINT "Protocol_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocol" ADD CONSTRAINT "Protocol_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocol" ADD CONSTRAINT "Protocol_clinicalEntryId_fkey" FOREIGN KEY ("clinicalEntryId") REFERENCES "ClinicalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolStage" ADD CONSTRAINT "ProtocolStage_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtocolBlock" ADD CONSTRAINT "ProtocolBlock_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProtocolStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

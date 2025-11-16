-- Add visibleToDirectivo flag to TeamVideo and Report

ALTER TABLE "TeamVideo"
  ADD COLUMN "visibleToDirectivo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Report"
  ADD COLUMN "visibleToDirectivo" BOOLEAN NOT NULL DEFAULT true;

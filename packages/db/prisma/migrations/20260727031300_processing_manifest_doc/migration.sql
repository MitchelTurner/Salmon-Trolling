-- AlterTable
ALTER TABLE "ProcessingManifest" ADD COLUMN IF NOT EXISTS "boatName" TEXT;
ALTER TABLE "ProcessingManifest" ADD COLUMN IF NOT EXISTS "documentText" TEXT;
ALTER TABLE "ProcessingManifest" ADD COLUMN IF NOT EXISTS "lines" JSONB;

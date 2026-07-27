-- AlterTable
ALTER TABLE "WeighIn" ADD COLUMN "clientId" TEXT;

-- Backfill unique clientId for existing rows (if any), then enforce uniqueness.
UPDATE "WeighIn" SET "clientId" = "id" WHERE "clientId" IS NULL;
ALTER TABLE "WeighIn" ALTER COLUMN "clientId" SET NOT NULL;
CREATE UNIQUE INDEX "WeighIn_clientId_key" ON "WeighIn"("clientId");

-- CreateTable
CREATE TABLE "DerbyAuditEvent" (
    "id" TEXT NOT NULL,
    "derbyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "weighInId" TEXT,
    "entryId" TEXT,
    "disputeId" TEXT,
    "detail" TEXT NOT NULL,
    "meta" JSONB NOT NULL,

    CONSTRAINT "DerbyAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerbyDispute" (
    "id" TEXT NOT NULL,
    "derbyId" TEXT NOT NULL,
    "weighInId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "DerbyDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DerbyAuditEvent_derbyId_at_idx" ON "DerbyAuditEvent"("derbyId", "at");

-- CreateIndex
CREATE INDEX "DerbyDispute_derbyId_status_idx" ON "DerbyDispute"("derbyId", "status");

-- CreateIndex
CREATE INDEX "DerbyDispute_weighInId_idx" ON "DerbyDispute"("weighInId");

-- AddForeignKey
ALTER TABLE "DerbyAuditEvent" ADD CONSTRAINT "DerbyAuditEvent_derbyId_fkey" FOREIGN KEY ("derbyId") REFERENCES "Derby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerbyDispute" ADD CONSTRAINT "DerbyDispute_derbyId_fkey" FOREIGN KEY ("derbyId") REFERENCES "Derby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerbyDispute" ADD CONSTRAINT "DerbyDispute_weighInId_fkey" FOREIGN KEY ("weighInId") REFERENCES "WeighIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

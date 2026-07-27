-- CreateTable
CREATE TABLE "GuestCatchReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "boatName" TEXT NOT NULL,
    "captainName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "conditionsSummary" TEXT,
    "catches" JSONB NOT NULL,
    "sharePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailedAt" TIMESTAMP(3),

    CONSTRAINT "GuestCatchReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestCatchReport_orgId_createdAt_idx" ON "GuestCatchReport"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestCatchReport_tripId_idx" ON "GuestCatchReport"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCatchReport_sharePath_key" ON "GuestCatchReport"("sharePath");

-- AddForeignKey
ALTER TABLE "GuestCatchReport" ADD CONSTRAINT "GuestCatchReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCatchReport" ADD CONSTRAINT "GuestCatchReport_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

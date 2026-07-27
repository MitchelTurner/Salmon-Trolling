-- CreateTable
CREATE TABLE "EffortLog" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "durationHours" DOUBLE PRECISION NOT NULL,
    "catchCount" INTEGER NOT NULL,
    "keptCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EffortLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EffortLog_tripId_key" ON "EffortLog"("tripId");

-- CreateIndex
CREATE INDEX "EffortLog_orgId_closedAt_idx" ON "EffortLog"("orgId", "closedAt");

-- AddForeignKey
ALTER TABLE "EffortLog" ADD CONSTRAINT "EffortLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EffortLog" ADD CONSTRAINT "EffortLog_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

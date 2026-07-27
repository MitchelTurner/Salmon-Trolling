-- CreateTable
CREATE TABLE "BoatAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoatAssignment_orgId_userId_idx" ON "BoatAssignment"("orgId", "userId");

-- CreateIndex
CREATE INDEX "BoatAssignment_boatId_active_idx" ON "BoatAssignment"("boatId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BoatAssignment_boatId_userId_key" ON "BoatAssignment"("boatId", "userId");

-- AddForeignKey
ALTER TABLE "BoatAssignment" ADD CONSTRAINT "BoatAssignment_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

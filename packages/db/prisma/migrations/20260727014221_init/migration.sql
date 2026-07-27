-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "OrgKind" AS ENUM ('PERSONAL', 'CHARTER', 'LODGE', 'DERBY');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'CAPTAIN', 'CREW', 'VIEWER');

-- CreateEnum
CREATE TYPE "Delivery" AS ENUM ('DOWNRIGGER', 'DIVER', 'LEADCORE', 'WIRE', 'WEIGHTED', 'FLATLINE');

-- CreateEnum
CREATE TYPE "GearKind" AS ENUM ('FLASHER', 'DODGER', 'LURE', 'BAIT', 'WEIGHT', 'DIVER', 'BALL');

-- CreateEnum
CREATE TYPE "FitScope" AS ENUM ('GLOBAL', 'BOAT', 'RIG');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OrgKind" NOT NULL DEFAULT 'PERSONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boat" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hasPaddleWheel" BOOLEAN NOT NULL DEFAULT false,
    "hasN2K" BOOLEAN NOT NULL DEFAULT false,
    "hasProbe" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Boat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delivery" "Delivery" NOT NULL,
    "deliveryConfig" JSONB NOT NULL,
    "mainlineType" TEXT NOT NULL,
    "mainlineDiaM" DOUBLE PRECISION NOT NULL,
    "attractorId" TEXT,
    "lureId" TEXT,
    "leaderLengthM" DOUBLE PRECISION NOT NULL,
    "stackPosition" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Rig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GearItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "kind" "GearKind" NOT NULL,
    "brand" TEXT,
    "model" TEXT NOT NULL,
    "sizeLabel" TEXT,
    "color" TEXT,
    "finish" TEXT,
    "dragN" DOUBLE PRECISION,
    "dragSource" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GearItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "boatId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "conditions" JSONB,
    "notes" TEXT,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "t" TIMESTAMP(3) NOT NULL,
    "geom" geography(Point,4326) NOT NULL,
    "sogMs" DOUBLE PRECISION,
    "cogRad" DOUBLE PRECISION,
    "headingRad" DOUBLE PRECISION,
    "stwMs" DOUBLE PRECISION,
    "soundingM" DOUBLE PRECISION,
    "seaTempC" DOUBLE PRECISION,

    CONSTRAINT "TrackPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catch" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT,
    "t" TIMESTAMP(3) NOT NULL,
    "geom" geography(Point,4326) NOT NULL,
    "species" TEXT NOT NULL,
    "lengthM" DOUBLE PRECISION,
    "massKg" DOUBLE PRECISION,
    "kept" BOOLEAN NOT NULL DEFAULT false,
    "rigSnapshot" JSONB NOT NULL,
    "depthSnapshot" JSONB NOT NULL,
    "photoKeys" TEXT[],
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Catch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geom" geography(Geometry,4326) NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Probe" (
    "id" TEXT NOT NULL,
    "boatId" TEXT,
    "serial" TEXT NOT NULL,
    "firmware" TEXT,
    "consentAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "Probe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbeSample" (
    "id" TEXT NOT NULL,
    "probeId" TEXT NOT NULL,
    "tripId" TEXT,
    "t" TIMESTAMP(3) NOT NULL,
    "depthM" DOUBLE PRECISION NOT NULL,
    "tempC" DOUBLE PRECISION,
    "speedMs" DOUBLE PRECISION,
    "rigSnapshot" JSONB,
    "clockOffsetMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProbeSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationFit" (
    "id" TEXT NOT NULL,
    "scope" "FitScope" NOT NULL,
    "boatId" TEXT,
    "rigId" TEXT,
    "params" JSONB NOT NULL,
    "rmseM" DOUBLE PRECISION NOT NULL,
    "sampleN" INTEGER NOT NULL,
    "fittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "CalibrationFit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regulation" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "species" TEXT,
    "body" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "parseOk" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catchId" TEXT,
    "species" TEXT NOT NULL,
    "t" TIMESTAMP(3) NOT NULL,
    "areaCode" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FishTag" (
    "id" TEXT NOT NULL,
    "catchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manifestId" TEXT,

    CONSTRAINT "FishTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingManifest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessingManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRecord" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "carrier" TEXT,
    "tracking" TEXT,
    "destination" JSONB,
    "shippedAt" TIMESTAMP(3),

    CONSTRAINT "ShippingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Derby" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "rules" JSONB NOT NULL,

    CONSTRAINT "Derby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerbyEntry" (
    "id" TEXT NOT NULL,
    "derbyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "waiverAt" TIMESTAMP(3),

    CONSTRAINT "DerbyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeighIn" (
    "id" TEXT NOT NULL,
    "derbyId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "massKg" DOUBLE PRECISION NOT NULL,
    "t" TIMESTAMP(3) NOT NULL,
    "station" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "witness" TEXT,
    "photoKeys" TEXT[],
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "WeighIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubId" TEXT,
    "plan" TEXT NOT NULL,
    "boatCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "seasonPass" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodEnd" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOp" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "opType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "clientTime" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_orgId_userId_key" ON "Membership"("orgId", "userId");

-- CreateIndex
CREATE INDEX "Boat_orgId_idx" ON "Boat"("orgId");

-- CreateIndex
CREATE INDEX "Rig_orgId_idx" ON "Rig"("orgId");

-- CreateIndex
CREATE INDEX "GearItem_orgId_kind_idx" ON "GearItem"("orgId", "kind");

-- CreateIndex
CREATE INDEX "Trip_orgId_startedAt_idx" ON "Trip"("orgId", "startedAt");

-- CreateIndex
CREATE INDEX "TrackPoint_tripId_t_idx" ON "TrackPoint"("tripId", "t");

-- CreateIndex
CREATE UNIQUE INDEX "Catch_supersedesId_key" ON "Catch"("supersedesId");

-- CreateIndex
CREATE INDEX "Catch_tripId_t_idx" ON "Catch"("tripId", "t");

-- CreateIndex
CREATE INDEX "Catch_species_t_idx" ON "Catch"("species", "t");

-- CreateIndex
CREATE INDEX "Spot_orgId_idx" ON "Spot"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Probe_serial_key" ON "Probe"("serial");

-- CreateIndex
CREATE INDEX "ProbeSample_tripId_t_idx" ON "ProbeSample"("tripId", "t");

-- CreateIndex
CREATE INDEX "ProbeSample_probeId_t_idx" ON "ProbeSample"("probeId", "t");

-- CreateIndex
CREATE INDEX "CalibrationFit_scope_supersededAt_idx" ON "CalibrationFit"("scope", "supersededAt");

-- CreateIndex
CREATE INDEX "Regulation_regionId_kind_supersededAt_idx" ON "Regulation"("regionId", "kind", "supersededAt");

-- CreateIndex
CREATE UNIQUE INDEX "HarvestRecord_catchId_key" ON "HarvestRecord"("catchId");

-- CreateIndex
CREATE INDEX "HarvestRecord_userId_t_idx" ON "HarvestRecord"("userId", "t");

-- CreateIndex
CREATE UNIQUE INDEX "FishTag_catchId_key" ON "FishTag"("catchId");

-- CreateIndex
CREATE UNIQUE INDEX "FishTag_code_key" ON "FishTag"("code");

-- CreateIndex
CREATE INDEX "ProcessingManifest_orgId_createdAt_idx" ON "ProcessingManifest"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRecord_tagId_key" ON "ShippingRecord"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Derby_slug_key" ON "Derby"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DerbyEntry_stripeSessionId_key" ON "DerbyEntry"("stripeSessionId");

-- CreateIndex
CREATE INDEX "DerbyEntry_derbyId_idx" ON "DerbyEntry"("derbyId");

-- CreateIndex
CREATE INDEX "WeighIn_derbyId_massKg_idx" ON "WeighIn"("derbyId", "massKg");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orgId_key" ON "Subscription"("orgId");

-- CreateIndex
CREATE INDEX "SyncOp_orgId_appliedAt_idx" ON "SyncOp"("orgId", "appliedAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boat" ADD CONSTRAINT "Boat_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rig" ADD CONSTRAINT "Rig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rig" ADD CONSTRAINT "Rig_attractorId_fkey" FOREIGN KEY ("attractorId") REFERENCES "GearItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rig" ADD CONSTRAINT "Rig_lureId_fkey" FOREIGN KEY ("lureId") REFERENCES "GearItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GearItem" ADD CONSTRAINT "GearItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackPoint" ADD CONSTRAINT "TrackPoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catch" ADD CONSTRAINT "Catch_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catch" ADD CONSTRAINT "Catch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Probe" ADD CONSTRAINT "Probe_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbeSample" ADD CONSTRAINT "ProbeSample_probeId_fkey" FOREIGN KEY ("probeId") REFERENCES "Probe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProbeSample" ADD CONSTRAINT "ProbeSample_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationFit" ADD CONSTRAINT "CalibrationFit_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationFit" ADD CONSTRAINT "CalibrationFit_rigId_fkey" FOREIGN KEY ("rigId") REFERENCES "Rig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishTag" ADD CONSTRAINT "FishTag_catchId_fkey" FOREIGN KEY ("catchId") REFERENCES "Catch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishTag" ADD CONSTRAINT "FishTag_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "ProcessingManifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRecord" ADD CONSTRAINT "ShippingRecord_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FishTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerbyEntry" ADD CONSTRAINT "DerbyEntry_derbyId_fkey" FOREIGN KEY ("derbyId") REFERENCES "Derby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeighIn" ADD CONSTRAINT "WeighIn_derbyId_fkey" FOREIGN KEY ("derbyId") REFERENCES "Derby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeighIn" ADD CONSTRAINT "WeighIn_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DerbyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

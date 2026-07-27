-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "rulesetVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "thumbs" TEXT NOT NULL,
    "ranInstead" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recommendation_orgId_createdAt_idx" ON "Recommendation"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationFeedback_recommendationId_key" ON "RecommendationFeedback"("recommendationId");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_orgId_createdAt_idx" ON "RecommendationFeedback"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

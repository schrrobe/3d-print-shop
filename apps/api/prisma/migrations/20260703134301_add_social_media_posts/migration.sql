-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('instagram', 'facebook');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "SocialMediaPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'draft',
    "caption" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "productId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "externalPostId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lockUntil" TIMESTAMP(3),
    "publishRequestId" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaPost_publishRequestId_key" ON "SocialMediaPost"("publishRequestId");

-- CreateIndex
CREATE INDEX "SocialMediaPost_status_scheduledAt_idx" ON "SocialMediaPost"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SocialMediaPost_platform_status_idx" ON "SocialMediaPost"("platform", "status");

-- CreateIndex
CREATE INDEX "SocialMediaPost_productId_idx" ON "SocialMediaPost"("productId");

-- CreateIndex
CREATE INDEX "SocialMediaPost_createdAt_idx" ON "SocialMediaPost"("createdAt");

-- AddForeignKey
ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "TrackedEventSource" AS ENUM ('client', 'server');

-- CreateEnum
CREATE TYPE "TrackingOutboxStatus" AS ENUM ('pending', 'sending', 'sent', 'failed', 'skipped');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "trackingSessionId" TEXT;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "metaCapiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tiktokEventsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tiktokPixelCode" TEXT;

-- CreateTable
CREATE TABLE "TrackingVisitor" (
    "id" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymizedAt" TIMESTAMP(3),

    CONSTRAINT "TrackingVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingPath" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "fbclid" TEXT,
    "ttclid" TEXT,
    "gclid" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'direct',
    "userAgent" TEXT,
    "deviceType" TEXT,
    "locale" "Locale",
    "anonymizedAt" TIMESTAMP(3),

    CONSTRAINT "TrackingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "TrackedEventSource" NOT NULL,
    "sessionId" TEXT,
    "visitorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT,
    "orderId" TEXT,
    "valueCents" INTEGER,
    "currency" TEXT DEFAULT 'EUR',
    "consentStatistics" BOOLEAN NOT NULL DEFAULT false,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "props" JSONB,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAttribution" (
    "orderId" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'last_non_direct_30d',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChannel" TEXT NOT NULL,
    "lastUtmSource" TEXT,
    "lastUtmMedium" TEXT,
    "lastUtmCampaign" TEXT,
    "lastClickIdType" TEXT,
    "lastClickId" TEXT,
    "lastTouchAt" TIMESTAMP(3),
    "lastSessionId" TEXT,
    "firstChannel" TEXT,
    "firstUtmSource" TEXT,
    "firstUtmCampaign" TEXT,
    "firstTouchAt" TIMESTAMP(3),
    "touchpointCount" INTEGER NOT NULL DEFAULT 0,
    "daysToConversion" INTEGER,

    CONSTRAINT "OrderAttribution_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "TrackingOutbox" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" "TrackingOutboxStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "responseCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "TrackingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_trackingSessionId_idx" ON "Order"("trackingSessionId");

-- CreateIndex
CREATE INDEX "TrackingSession_visitorId_startedAt_idx" ON "TrackingSession"("visitorId", "startedAt");

-- CreateIndex
CREATE INDEX "TrackingSession_startedAt_idx" ON "TrackingSession"("startedAt");

-- CreateIndex
CREATE INDEX "TrackingSession_channel_idx" ON "TrackingSession"("channel");

-- CreateIndex
CREATE INDEX "TrackingEvent_name_occurredAt_idx" ON "TrackingEvent"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_occurredAt_idx" ON "TrackingEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_sessionId_idx" ON "TrackingEvent"("sessionId");

-- CreateIndex
CREATE INDEX "TrackingEvent_orderId_idx" ON "TrackingEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingEvent_name_orderId_key" ON "TrackingEvent"("name", "orderId");

-- CreateIndex
CREATE INDEX "OrderAttribution_lastChannel_idx" ON "OrderAttribution"("lastChannel");

-- CreateIndex
CREATE INDEX "TrackingOutbox_status_nextAttemptAt_idx" ON "TrackingOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingOutbox_eventId_destination_key" ON "TrackingOutbox"("eventId", "destination");

-- AddForeignKey
ALTER TABLE "TrackingSession" ADD CONSTRAINT "TrackingSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "TrackingVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrackingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttribution" ADD CONSTRAINT "OrderAttribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingOutbox" ADD CONSTRAINT "TrackingOutbox_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TrackingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "metaPixelId" TEXT,
    "ga4MeasurementId" TEXT,
    "gtmContainerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

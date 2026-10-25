-- Sales channels: shareable influencer links (/r/<code>) with click counting and
-- per-order attribution. Commission base + amount are frozen on the order at
-- checkout so later rule changes never rewrite past payouts.

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('percent', 'fixed');

-- CreateTable
CREATE TABLE "SalesChannel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT,
    "voucherId" TEXT,
    "commissionType" "CommissionType" NOT NULL,
    "commissionValue" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesChannelClick" (
    "id" TEXT NOT NULL,
    "salesChannelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesChannelClick_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "salesChannelId" TEXT,
ADD COLUMN "commissionBaseCents" INTEGER,
ADD COLUMN "commissionCents" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannel_code_key" ON "SalesChannel"("code");
CREATE UNIQUE INDEX "SalesChannel_voucherId_key" ON "SalesChannel"("voucherId");
CREATE INDEX "SalesChannelClick_salesChannelId_createdAt_idx" ON "SalesChannelClick"("salesChannelId", "createdAt");
CREATE INDEX "Order_salesChannelId_idx" ON "Order"("salesChannelId");

-- AddForeignKey
ALTER TABLE "SalesChannel" ADD CONSTRAINT "SalesChannel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesChannel" ADD CONSTRAINT "SalesChannel_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesChannelClick" ADD CONSTRAINT "SalesChannelClick_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_salesChannelId_fkey" FOREIGN KEY ("salesChannelId") REFERENCES "SalesChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('submitted', 'in_review', 'info_needed', 'approved', 'rejected', 'replacement_planned', 'refund_planned', 'closed');

-- CreateEnum
CREATE TYPE "ComplaintReason" AS ENUM ('damaged', 'wrong_item', 'quality_issue', 'missing_parts', 'color_mismatch', 'other');

-- CreateEnum
CREATE TYPE "ComplaintResolution" AS ENUM ('replacement_print', 'refund', 'voucher', 'rejection', 'further_review');

-- CreateEnum
CREATE TYPE "AttachmentAuthor" AS ENUM ('customer', 'staff');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('open', 'passed', 'failed', 'reprint_required', 'overridden');

-- CreateEnum
CREATE TYPE "AmsSlotStatus" AS ENUM ('empty', 'loaded', 'low', 'error', 'disabled');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('waiting_for_qc', 'ready_for_shipping', 'packed', 'shipped', 'delivered', 'problem');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected', 'hidden');

-- AlterTable
ALTER TABLE "Color" ADD COLUMN     "minStockGrams" INTEGER,
ADD COLUMN     "outOfStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FilamentSpool" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "minRemainingGrams" INTEGER,
ADD COLUMN     "reorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storageLocation" TEXT,
ADD COLUMN     "totalGrams" INTEGER;

-- Drop deprecated AMS assignment columns; AmsSlot.spoolId is the single source of truth.
ALTER TABLE "FilamentSpool" DROP COLUMN IF EXISTS "printerId",
DROP COLUMN IF EXISTS "amsSlot";

-- AlterTable
ALTER TABLE "PrinterJob" ADD COLUMN     "plannedEndAt" TIMESTAMP(3),
ADD COLUMN     "plannedStartAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customMade" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AmsUnit" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmsUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmsSlot" (
    "id" TEXT NOT NULL,
    "amsUnitId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "status" "AmsSlotStatus" NOT NULL DEFAULT 'empty',
    "spoolId" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmsSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceWindow" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcRecord" (
    "id" TEXT NOT NULL,
    "printerJobId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "status" "QcStatus" NOT NULL DEFAULT 'open',
    "colorOk" BOOLEAN NOT NULL DEFAULT false,
    "surfaceOk" BOOLEAN NOT NULL DEFAULT false,
    "dimensionsOk" BOOLEAN NOT NULL DEFAULT false,
    "stabilityOk" BOOLEAN NOT NULL DEFAULT false,
    "completenessOk" BOOLEAN NOT NULL DEFAULT false,
    "packagingOk" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "overrideReason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcAttachment" (
    "id" TEXT NOT NULL,
    "qcRecordId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QcAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complaintNumber" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'submitted',
    "reason" "ComplaintReason" NOT NULL,
    "description" TEXT NOT NULL,
    "internalNote" TEXT,
    "ticketId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintItem" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "ComplaintItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintAttachment" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" "AttachmentAuthor" NOT NULL DEFAULT 'customer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintDecision" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "resolution" "ComplaintResolution" NOT NULL,
    "note" TEXT,
    "refundAmountCents" INTEGER,
    "voucherCode" TEXT,
    "reprintJobId" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComplaintCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'waiting_for_qc',
    "carrier" "Carrier",
    "trackingNumber" TEXT,
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "weightGrams" INTEGER,
    "notes" TEXT,
    "packingListPdfPath" TEXT,
    "deliveryNotePdfPath" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentStatusEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fromStatus" "ShipmentStatus",
    "toStatus" "ShipmentStatus" NOT NULL,
    "byUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShipmentCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalAccessLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedConfiguration" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "selectedColors" JSONB NOT NULL,
    "previewImage" TEXT,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photoPath" TEXT,
    "displayName" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'de',
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "internalNote" TEXT,
    "flaggedAbuse" BOOLEAN NOT NULL DEFAULT false,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmsUnit_printerId_position_key" ON "AmsUnit"("printerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AmsSlot_spoolId_key" ON "AmsSlot"("spoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AmsSlot_amsUnitId_slotIndex_key" ON "AmsSlot"("amsUnitId", "slotIndex");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_printerId_startsAt_idx" ON "MaintenanceWindow"("printerId", "startsAt");

-- CreateIndex
CREATE INDEX "QcRecord_printerJobId_idx" ON "QcRecord"("printerJobId");

-- CreateIndex
CREATE INDEX "QcRecord_status_idx" ON "QcRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintNumber_key" ON "Complaint"("complaintNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_accessToken_key" ON "Complaint"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_ticketId_key" ON "Complaint"("ticketId");

-- CreateIndex
CREATE INDEX "Complaint_orderId_idx" ON "Complaint"("orderId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintItem_complaintId_orderItemId_key" ON "ComplaintItem"("complaintId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintDecision_reprintJobId_key" ON "ComplaintDecision"("reprintJobId");

-- CreateIndex
CREATE INDEX "ComplaintDecision_complaintId_idx" ON "ComplaintDecision"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentItem_shipmentId_orderItemId_key" ON "ShipmentItem"("shipmentId", "orderItemId");

-- CreateIndex
CREATE INDEX "ShipmentStatusEvent_shipmentId_idx" ON "ShipmentStatusEvent"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");

-- CreateIndex
CREATE INDEX "PortalAccessLog_tokenId_createdAt_idx" ON "PortalAccessLog"("tokenId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedConfiguration_shareToken_key" ON "SavedConfiguration"("shareToken");

-- CreateIndex
CREATE INDEX "SavedConfiguration_productId_idx" ON "SavedConfiguration"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX CONCURRENTLY "PrinterJob_printerId_plannedStartAt_idx" ON "PrinterJob"("printerId", "plannedStartAt");

-- Only one open QC record may exist per print job.
CREATE UNIQUE INDEX "QcRecord_one_open_per_job_idx" ON "QcRecord"("printerJobId") WHERE "status" = 'open';

-- AddForeignKey
ALTER TABLE "AmsUnit" ADD CONSTRAINT "AmsUnit_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmsSlot" ADD CONSTRAINT "AmsSlot_amsUnitId_fkey" FOREIGN KEY ("amsUnitId") REFERENCES "AmsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmsSlot" ADD CONSTRAINT "AmsSlot_spoolId_fkey" FOREIGN KEY ("spoolId") REFERENCES "FilamentSpool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_printerJobId_fkey" FOREIGN KEY ("printerJobId") REFERENCES "PrinterJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcAttachment" ADD CONSTRAINT "QcAttachment_qcRecordId_fkey" FOREIGN KEY ("qcRecordId") REFERENCES "QcRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintItem" ADD CONSTRAINT "ComplaintItem_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintItem" ADD CONSTRAINT "ComplaintItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintDecision" ADD CONSTRAINT "ComplaintDecision_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintDecision" ADD CONSTRAINT "ComplaintDecision_reprintJobId_fkey" FOREIGN KEY ("reprintJobId") REFERENCES "PrinterJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintDecision" ADD CONSTRAINT "ComplaintDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentStatusEvent" ADD CONSTRAINT "ShipmentStatusEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentStatusEvent" ADD CONSTRAINT "ShipmentStatusEvent_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccessLog" ADD CONSTRAINT "PortalAccessLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "MagicLinkToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PayPal is added as a direct payment provider (ADR 0001), and refunds are now
-- executed via the Stripe/PayPal APIs (or recorded manually for bank transfer and
-- bitcoin). Each successful refund gets an invoice correction (RK-…) with its own
-- per-year counter, analogous to invoices.
ALTER TYPE "PaymentMethod" ADD VALUE 'paypal';

CREATE TYPE "RefundStatus" AS ENUM ('pending', 'succeeded', 'failed');
CREATE TYPE "RefundProvider" AS ENUM ('stripe', 'paypal', 'manual');

ALTER TABLE "Payment" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paypalOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paypalCaptureId" TEXT;
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Payment_paypalOrderId_key" ON "Payment"("paypalOrderId");
CREATE UNIQUE INDEX "Payment_paypalCaptureId_key" ON "Payment"("paypalCaptureId");

CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "provider" "RefundProvider" NOT NULL,
    "providerRefundId" TEXT,
    "reason" TEXT,
    "failureReason" TEXT,
    "createdById" TEXT,
    "complaintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Refund_amountCents_positive" CHECK ("amountCents" > 0)
);
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");
CREATE INDEX "Refund_complaintId_idx" ON "Refund"("complaintId");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvoiceCorrection" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'de',
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "pdfPath" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "sendLockUntil" TIMESTAMP(3),

    CONSTRAINT "InvoiceCorrection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceCorrection_number_key" ON "InvoiceCorrection"("number");
CREATE UNIQUE INDEX "InvoiceCorrection_refundId_key" ON "InvoiceCorrection"("refundId");
CREATE UNIQUE INDEX "InvoiceCorrection_year_sequence_key" ON "InvoiceCorrection"("year", "sequence");
CREATE INDEX "InvoiceCorrection_invoiceId_idx" ON "InvoiceCorrection"("invoiceId");
ALTER TABLE "InvoiceCorrection" ADD CONSTRAINT "InvoiceCorrection_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceCorrection" ADD CONSTRAINT "InvoiceCorrection_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InvoiceCorrectionCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCorrectionCounter_pkey" PRIMARY KEY ("year")
);

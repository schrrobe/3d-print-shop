-- Cancelled or refunded orders with an issued invoice get a Stornorechnung. An
-- issued invoice must not be changed or deleted, so the cancellation is a second
-- document numbered from the same invoice range, recorded on the invoice row.
ALTER TABLE "Invoice" ADD COLUMN "cancellationNumber" TEXT;
-- Year and sequence of the shared counter, so invoices and cancellations together
-- can be checked for gaps.
ALTER TABLE "Invoice" ADD COLUMN "cancellationYear" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "cancellationSequence" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "cancellationPdfPath" TEXT;

CREATE UNIQUE INDEX "Invoice_cancellationNumber_key" ON "Invoice"("cancellationNumber");
CREATE UNIQUE INDEX "Invoice_cancellationYear_cancellationSequence_key" ON "Invoice"("cancellationYear", "cancellationSequence");

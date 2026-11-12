-- DHL labels from the order page: the active label PDF hangs on the shipment,
-- and the checkout opt-in decides whether the customer's email goes to the
-- carrier for delivery notifications (null = no consent).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "carrierEmailConsentAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "labelPdfPath" TEXT;

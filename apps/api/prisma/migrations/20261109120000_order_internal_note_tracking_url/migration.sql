-- Admins keep a staff-only note per order (globally omitted by the API) and
-- can attach the carrier's tracking link next to the tracking number.
ALTER TABLE "Order" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingUrl" TEXT;

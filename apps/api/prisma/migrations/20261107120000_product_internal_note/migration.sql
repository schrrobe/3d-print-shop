-- Admins keep a staff-only free-text note per product (never exposed publicly;
-- the API omits the column globally and re-includes it only for admin reads).
ALTER TABLE "Product" ADD COLUMN "internalNote" TEXT;

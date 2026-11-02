-- Admin-created paylink orders (free-form items) must be distinguishable from
-- shop checkouts and accepted quotes in the admin list and the invoice mail.
CREATE TYPE "OrderSource" AS ENUM ('shop', 'admin', 'quote');

ALTER TABLE "Order" ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'shop';

UPDATE "Order" SET "source" = 'quote'
WHERE "id" IN (SELECT "orderId" FROM "Quote" WHERE "orderId" IS NOT NULL);

CREATE INDEX "Order_source_idx" ON "Order"("source");

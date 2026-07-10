-- Invalidate existing JWTs whenever a user's credentials change.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Make checkout retries and Stripe webhook lookups idempotent.
ALTER TABLE "Order" ADD COLUMN "checkoutKey" TEXT;
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

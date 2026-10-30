-- Vorkasse (bank_transfer) grants a discount on goods; stored separately from
-- the voucher discount so the invoice can show both lines.
ALTER TABLE "Order" ADD COLUMN "prepaymentDiscountCents" INTEGER NOT NULL DEFAULT 0;

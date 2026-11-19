-- Optional "Lieferung vor Weihnachten" surcharge chosen at checkout. Kept apart
-- from goods value so it never feeds the provider payout or commission base.
ALTER TABLE "Order" ADD COLUMN "christmasDeliveryCents" INTEGER NOT NULL DEFAULT 0;

-- Support may redirect a parcel to a different recipient before it ships. The
-- billing address (existing columns) stays untouched so the invoice never
-- changes; NULL means deliver to the billing address.
ALTER TABLE "Order" ADD COLUMN "deliveryAddress" JSONB;

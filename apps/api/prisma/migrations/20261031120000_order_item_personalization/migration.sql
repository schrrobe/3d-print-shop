-- Box personalisation (customer name on the label, +6 € per box). Kept as its
-- own column so admin lists and the invoice can show it without parsing the
-- localized item name snapshot.
ALTER TABLE "OrderItem" ADD COLUMN "personalization" TEXT;

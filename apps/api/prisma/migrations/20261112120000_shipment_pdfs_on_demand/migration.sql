-- Packing lists and delivery notes are rendered on every download so a changed
-- delivery address shows up at once; the cached file paths are no longer used.
-- Old files under INVOICE_DIR/shipping can be removed by hand.
ALTER TABLE "Shipment" DROP COLUMN "packingListPdfPath",
DROP COLUMN "deliveryNotePdfPath";

-- Shop-wide default color per zone (Record<ColorZoneSlot, colorId>), set in the
-- admin and copied onto every product's color slots instead of editing each product.
ALTER TABLE "ShopSettings" ADD COLUMN "defaultColors" JSONB;

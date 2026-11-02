-- Hinweis-Leiste oben im Shop (z. B. Versandverzögerung), per Admin-Schalter ein/aus.
ALTER TABLE "ShopSettings" ADD COLUMN "infoBannerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopSettings" ADD COLUMN "infoBanner" JSONB;

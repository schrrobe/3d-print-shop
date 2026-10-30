-- Einmaliges Preis-Update für die BoxLoc-Produkte auf DEV (seed-products.ts überspringt bestehende Slugs).
-- mini 12,00 → 12,99 €, single 20,00 → 22,50 €, double bleibt 35,00 €.
-- Nur alte Seed-Preise werden angefasst, im Admin geänderte Preise bleiben.
--
--   docker exec -i kaliberbox-postgres-dev psql -U kaliberbox -v ON_ERROR_STOP=1 < apps/api/prisma/sql/boxloc-prices-dev.sql

BEGIN;

UPDATE "Product" SET "priceCents" = 1299, "updatedAt" = now()
WHERE slug LIKE 'boxloc-mini-%' AND "priceCents" = 1200;

UPDATE "Product" SET "priceCents" = 2250, "updatedAt" = now()
WHERE slug LIKE 'boxloc-single-%' AND "priceCents" = 2000;

SELECT split_part(slug, '-', 2) AS size, "priceCents", count(*)
FROM "Product" WHERE slug LIKE 'boxloc-%'
GROUP BY 1, 2 ORDER BY 1, 2;

COMMIT;

-- Italian copy for the opening banner. Only added while the German text is
-- still the seeded original, so a banner the admin has since rewritten is
-- left alone (the shop falls back to German for a missing locale).
UPDATE "ShopSettings"
SET "promoBanner" = jsonb_set(
  "promoBanner",
  '{content,it}',
  '{"title": "Siamo aperti!", "text": "Per festeggiare l''apertura del negozio, i primi 20 ordini hanno il 10% di sconto. Basta inserire questo codice alla cassa:", "cta": "Scopri il negozio"}'::jsonb
)
WHERE "id" = 'singleton'
  AND "promoBanner" #>> '{content,it}' IS NULL
  AND "promoBanner" #>> '{content,de,text}' = 'Zur Shop-Eröffnung bekommen die ersten 20 Bestellungen 10 % Rabatt. Gib einfach diesen Code an der Kasse ein:';

-- Promo modal becomes an admin setting (on/off + per-locale content) instead of
-- the NUXT_PUBLIC_PROMO_BANNER env flag with hard-coded texts. Seeded with the
-- shop-opening OPEN10 campaign; stays off until switched on in the admin.
ALTER TABLE "ShopSettings" ADD COLUMN "promoBannerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopSettings" ADD COLUMN "promoBanner" JSONB;

INSERT INTO "ShopSettings" ("id", "promoBanner", "updatedAt")
VALUES ('singleton', '{"code": "OPEN10", "content": {"de": {"title": "Wir haben eröffnet!", "text": "Zur Shop-Eröffnung bekommen die ersten 20 Bestellungen 10 % Rabatt. Gib einfach diesen Code an der Kasse ein:", "cta": "Jetzt stöbern"}, "en": {"title": "We''re open!", "text": "To celebrate our shop opening, the first 20 orders get 10% off. Just enter this code at checkout:", "cta": "Start shopping"}, "pl": {"title": "Otworzyliśmy sklep!", "text": "Z okazji otwarcia sklepu pierwsze 20 zamówień otrzymuje 10% rabatu. Wystarczy wpisać ten kod przy kasie:", "cta": "Do zakupów"}, "fr": {"title": "Nous sommes ouverts !", "text": "Pour fêter l''ouverture de la boutique, les 20 premières commandes bénéficient de 10 % de réduction. Saisissez simplement ce code lors du paiement :", "cta": "Découvrir la boutique"}, "nl": {"title": "We zijn open!", "text": "Ter ere van de opening van onze shop krijgen de eerste 20 bestellingen 10% korting. Vul bij het afrekenen gewoon deze code in:", "cta": "Begin met winkelen"}, "cs": {"title": "Otevřeli jsme!", "text": "K otevření obchodu dostane prvních 20 objednávek slevu 10 %. Stačí při placení zadat tento kód:", "cta": "Začít nakupovat"}}}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "promoBanner" = EXCLUDED."promoBanner";

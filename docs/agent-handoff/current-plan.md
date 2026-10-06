# Current plan — Shop-Redesign kaliberbox.de

## Status: abgeschlossen — Branch `agent/shop-redesign`

Impeccable-Finish-Review: 7 Fixes umgesetzt und vom Reviewer als resolved bewertet,
DESIGN.md + `.impeccable/design.json` dokumentieren die neue Welt. Betroffene Shop-
E2E-Specs (44) inkl. axe und Stripe-Checkout lokal grün.

Offen beim Produktinhaber: Rechtsprüfung des WaffG-Hinweistexts, echte Preise,
volle E2E-Suite in CI.

## Goal

Kompletter Redesign des Kunden-Shops für **kaliberbox.de** (3D-gedruckte Patronenboxen
pro Kaliber) mit Impeccable: mobile-first, WCAG 2.2 AA (+44 px Targets), bessere UX.
Produktwahrheit: `apps/web/PRODUCT.md`. Entscheidungen aus der Grill-Session (Q1–Q28)
sind unten zusammengefasst.

## Decisions

- Echter Redesign (neue visuelle Welt „Präzisionswerkstatt", keine Militär-Ästhetik).
- Scope: Start, Liste, Produktseite, Warenkorb, Checkout(+Erfolg), Wunschliste,
  Header/Footer/Consent. Support/Portal/Reklamation/Legal erben nur Layout + Tokens.
- Admin bleibt optisch unverändert; Shop-Tokens gescoped, Shop-Komponenten in
  `apps/web/app/components/shop/`. Admin bekommt nur Kaliber-/Größenpflege.
- Backend minimal: `Caliber`-Tabelle (name, slug, group: HANDGUN|RIFLE|RIMFIRE) m:n zu
  Product; `Product.capacity Int?` + `Product.familyKey String?` (Geschwister 50/100);
  `GET /api/products?caliber=<slug>`; Seed: 6 Kaliber × 50/100 = 12 Produkte
  (Platzhalterpreise), Zonen „Box" + „Beschriftung". Keine Sortierung (YAGNI).
- Startseite: Kaliber-Hero „Für welches Kaliber?" → gefilterte Liste.
- Liste: Kaliber-Chips nach Gruppe, eine Karte pro Familie („ab X € · 50/100"),
  Leerstand → „Kaliber nicht dabei?" → Support-Ticket vorausgefüllt.
- Produktseite: 2D-SVG-Boxvorschau mit Live-Farben (3D nur bei echtem GLB),
  50/100-Umschalter (navigiert zum Geschwister), mobil Sticky-Kaufleiste,
  § 36 WaffG-Hinweis.
- Checkout: eine Seite, 3 Abschnitte (Kontakt/Adresse/Zahlung), mobil einklappbare
  Übersicht, Gutschein im Checkout, Land-Select, feldgenaue Fehler, autocomplete/
  inputmode, AGB-/Widerrufshinweis über Button, „Ist ein Geschenk" → Notiz.
- Mobil: kompakter Header + Vollbild-Menü (Sprache/Theme im Menü), kein Bottom-Tab.
- Hell + Dunkel gleichwertig, Standard System.
- Upload: nur Kundenseite/Nav/Texte/E2E entfernen; Backend/Admin/Quote bleiben.
- Alle neuen Texte in de/en/pl/fr/nl/cs.
- Build-Pfad: code-led (keine Bildgenerierung verfügbar).

## Phases (ein Commit je Phase)

1. PRODUCT.md, Richtungsentscheidung, Tokens, Font, Layout, Header (+Mobilmenü),
   Footer, Skip-Link, Consent-Banner.
2. Kaliber-Backend: Prisma-Schema + handgeschriebene Migration, API-Filter,
   Admin-Pflege, Seed, Unit-Tests.
3. Startseite + Produktliste.
4. Produktseite (Vorschau, Konfigurator, 50/100, Sticky-Bar, WaffG-Hinweis).
5. Warenkorb + Checkout + Erfolgsseite.
6. Wunschliste, Upload-Entfernung, i18n-Aufräumen, Docs.

## Test plan

- Bestehende `data-testid`s erhalten (Liste im Explorer-Report; u. a. product-*,
  cart-*, voucher-*, checkout-*, payment-*, wishlist-*, consent-*).
- `pnpm lint`, `pnpm typecheck`, Unit-Tests (API: Kaliberfilter, Seed-Konsistenz).
- Playwright E2E inkl. axe; axe zusätzlich auf `/checkout` und `/wishlist`.
- Upload-E2E entfernen; Produkt-E2E an neue Seed-Slugs anpassen.
- Screenshots 390 px + 1440 px, Impeccable detect + Finish-Review.

## Risks / assumptions

- E2E-Specs referenzieren Demo-Slugs (`spiral-vase` …) → werden auf Kaliber-Slugs umgestellt.
- Migration per Hand (Shadow-DB kaputt), kein `CONCURRENTLY`.
- WaffG-Hinweistext muss rechtlich geprüft werden (nicht von uns freigegeben).
- Preise sind Platzhalter.

## Open questions

- Keine offenen Produktfragen; visuelle Richtung wird über Impeccable-Entscheidungsseite gewählt.

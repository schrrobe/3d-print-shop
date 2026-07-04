# Testing

## Unit-Tests (Vitest)

```bash
pnpm test          # alle Packages (ohne e2e)
pnpm --filter @print-shop/utils test
```

Abgedeckt (190+ Tests):
Preisberechnung · Versandkosten (6,99 € / frei ab 150 €, inkl. Grenzwert) · Farbmapping
(Zonen-Extraktion aus Mesh-Namen, Auswahl-Validierung, Defaults, inaktive Farben) ·
Social-Post-Statusmaschine, -RBAC und -Zod-Schemas · Social-Scheduler (Idempotenz per
CAS-Claim, Lock-Recovery, Retry) · Mock-Publisher & Meta-Error-Mapping ·
Rollen/Rechte-Matrix (inkl. Reklamationen/QC/Filament/Versand/Reviews) · Order-,
Produktions-, Reklamations-, QC-, Versand- und Review-Statusmaschinen · Kalender-Overlap
(halboffene Intervalle, Berührung ≠ Überlappung) · Filament-Bestand (Mindestbestand,
Nachbestellung, Farb-Aggregat) · `lineKey`/kanonische Farbauswahl (Cart/Wishlist-Merge) ·
Magic-Link-Token (nur Hash, Ablauf, Cap) · Review-Eligibility & öffentliches DTO
(kein PII-Leak) · Popular-Configs (Schwelle ≥ 2, Verfügbarkeit) · Bitcoin
paid-ab-2-Bestätigungen (inkl. Unter-/Überzahlung) · Rechnungsnummern (Format, Jahreswechsel,
Sequenz) · Upload-Validierung (Whitelist, 50-MB-Grenze inklusive, Pfad-Sanitizing) ·
Consent-Logik (Opt-in-Gates, Versionierung, defensives Parsing) · Zod-Schemas ·
E-Mail-Templates (i18n-Fallback, HTML-Escaping).

## E2E-Tests (Playwright, `apps/e2e`)

```bash
pnpm db:up         # Postgres muss laufen
pnpm e2e           # startet API (3001) + Nuxt (3000) automatisch (webServer)
```

`global-setup.ts` stellt deterministische Daten her: `prisma migrate deploy` →
`prisma:reset-data` (TRUNCATE aller App-Tabellen) → Seed. **Achtung:** leert die lokale
Dev-Datenbank — für getrennte Daten eigene `DATABASE_URL` setzen.

31 Spec-Dateien: auth (Login/Logout/RBAC) · product-catalog · product-configurator
(Viewer-Fallback, 4 Farbzonen, Auswahl) · cart (Mengen, Versandgrenze, Persistenz) ·
checkout-stripe (Mock-Stripe, Bank, Bitcoin 2-Confirmations) · upload-request (inkl.
Fehlerfälle) · quote-payment-link (annehmen/ablehnen/bezahlen) · support-tickets
(Formular→Token-Thread, Order-Matching, Reopen/Close, Support-RBAC) · admin-orders
(mark-paid, Statusmaschine, Versand) · admin-products · admin-colors · admin-printers ·
production-queue (inkl. QC-Gate vor `ready_to_ship`) · invoice (Sequenz, PDF-Magic-Bytes) ·
email-notifications (EmailLog-Dev-Modus) · consent-tracking · i18n (6 Sprachen) · theme
(dark/light/system/persistenz) · animations (inkl. prefers-reduced-motion) ·
accessibility (axe, WCAG A/AA) · seo (SSR-Meta, robots, Sitemap, 404) ·
social-media-planner (Planner-Ansichten, Editor-Prefill, Planen/Bearbeiten/Löschen,
Retry via Mock-Provider `[e2e-fail]`, RBAC, Publish-Sperre).

Neue Feature-Specs: **complaints** (Kunde eröffnet + Foto, Admin-Entscheidung
`replacement_print` → Job in Queue, Ticket-Link, falscher Token 401) · **quality-control**
(Checkliste erzwingt alle 6, Fail→Reprint, Override nur Admin — Produktion 403) ·
**filament-ams** (Spulen-CRUD, Warnungen/Einkaufsliste, `outOfStock` im Shop, Slot-Kollision
409) · **production-calendar** (Overlap-409 + `force`, verschieben, Wartungsfenster blockt) ·
**shipping-management** (QC-Gate 409, DHL-Versand, `shipping_confirmation`-Mail, PDFs,
Historie) · **customer-portal** (Magic-Link via Seed-Token, Bearer-only, abgelaufen→Renewal,
Anti-Enumeration 202) · **wishlist** (localStorage-Persistenz, in den Warenkorb, Toggle) ·
**product-configurator-advanced** (Speichern/Teilen dedupliziert, `?config=`-Laden mit
Verfügbarkeitswarnung, Cart-Edit) · **reviews** (Abgabe nach Bestellung, Duplikat 409,
Admin-Freigabe, rejected nie öffentlich, kein PII).

Konventionen: Selektoren ausschließlich über `data-testid`; Setup-Abkürzungen über die API
(`helpers/api.ts`); Zahlungen über die Dev-Mock-Endpunkte; 1 Worker (gemeinsame DB).

## CI

`.github/workflows/ci.yml`: Job „checks" (install → prisma validate/generate → lint →
typecheck → vitest → build → storybook build) + Job „e2e" (Postgres-Service-Container →
Playwright chromium). Report-Upload bei Fehlschlag.

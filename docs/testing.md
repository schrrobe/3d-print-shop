# Testing

## Unit-Tests (Vitest)

```bash
pnpm test          # alle Packages (ohne e2e)
pnpm --filter @print-shop/utils test
```

Abgedeckt (76+ Tests):
Preisberechnung · Versandkosten (6,99 € / frei ab 150 €, inkl. Grenzwert) · Farbmapping
(Zonen-Extraktion aus Mesh-Namen, Auswahl-Validierung, Defaults, inaktive Farben) ·
Rollen/Rechte-Matrix · Order- und Produktions-Statusmaschinen · Bitcoin
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

19 Spec-Dateien: auth (Login/Logout/RBAC) · product-catalog · product-configurator
(Viewer-Fallback, 4 Farbzonen, Auswahl) · cart (Mengen, Versandgrenze, Persistenz) ·
checkout-stripe (Mock-Stripe, Bank, Bitcoin 2-Confirmations) · upload-request (inkl.
Fehlerfälle) · quote-payment-link (annehmen/ablehnen/bezahlen) · admin-orders (mark-paid,
Statusmaschine, Versand) · admin-products · admin-colors · admin-printers · production-queue ·
invoice (Sequenz, PDF-Magic-Bytes) · email-notifications (EmailLog-Dev-Modus) ·
consent-tracking · i18n (6 Sprachen) · theme (dark/light/system/persistenz) · animations
(inkl. prefers-reduced-motion) · accessibility (axe, WCAG A/AA).

Konventionen: Selektoren ausschließlich über `data-testid`; Setup-Abkürzungen über die API
(`helpers/api.ts`); Zahlungen über die Dev-Mock-Endpunkte; 1 Worker (gemeinsame DB).

## CI

`.github/workflows/ci.yml`: Job „checks" (install → prisma validate/generate → lint →
typecheck → vitest → build → storybook build) + Job „e2e" (Postgres-Service-Container →
Playwright chromium). Report-Upload bei Fehlschlag.

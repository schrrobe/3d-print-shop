# 3D Print Shop

DSGVO-konformer Onlineshop für 3D-Druck-Artikel: konfigurierbare Standardprodukte mit
Live-3D-Farbvorschau, Upload eigener Modelle mit individuellem Angebot & Zahlungslink,
Support-Ticketsystem mit Token-Zugriff und Inbound-E-Mail-Antworten (Resend Receiving),
Adminbereich mit Rollen, Drucker-/Produktionsverwaltung, interne Rechnungserstellung.

## Tech-Stack

Monorepo (pnpm workspaces + Turborepo) · Nuxt 4 (Vue 3, TypeScript, Vite, SSR) ·
Tailwind CSS 4 (CSS-first Design-Tokens) · Radix Vue · Storybook 9 · GSAP + ScrollTrigger ·
three.js (GLB-Viewer) · vue-i18n (de/en/pl/fr/nl/cs) · Express 5 + TypeScript ·
PostgreSQL 16 + Prisma 6 · Zod · Resend · Stripe · Bitcoin-Provider-Abstraktion ·
Vitest · Playwright · GitHub Actions.

Struktur und Details: [docs/architecture.md](docs/architecture.md)

## Setup

Voraussetzungen: **Node 24** (`.tool-versions` für asdf liegt bei), **pnpm 11**, **Docker**.

```bash
pnpm install
cp .env.example .env          # Platzhalter — niemals echte Secrets committen
cp .env.example apps/api/.env

pnpm db:up                    # PostgreSQL (Docker, Port 15433)
pnpm db:migrate               # Prisma-Migrationen
pnpm db:seed                  # Beispieldaten (Produkte, Farben, Drucker, Bestellungen)

pnpm dev                      # web: http://localhost:3000 · api: http://localhost:3001
```

**Admin-Login (Seed, nur Entwicklung):** `admin@example.com` / `admin-dev-password`
→ http://localhost:3000/admin

## Environment-Variablen

Alle Variablen mit Erklärung in [`.env.example`](.env.example). Wichtige Gruppen:
`DATABASE_URL` · `JWT_SECRET`/`COOKIE_SECURE` (Sessions) · `RESEND_API_KEY`/`EMAIL_FROM`
(E-Mails; leer = Dev-Log-Modus) · `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (leer =
Mock-Modus) · `BITCOIN_PROVIDER`/`BITCOIN_XPUB` (mock = Standard) · `BANK_*` (Bankdaten) ·
`NUXT_PUBLIC_GA4_MEASUREMENT_ID`/`NUXT_PUBLIC_META_PIXEL_ID` (Tracking — lädt nur nach
Consent-Opt-in) · `UPLOAD_DIR`/`INVOICE_DIR`.

## Skripte

| Befehl | Zweck |
|---|---|
| `pnpm dev` | web + api parallel (Turbo) |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc & vue-tsc in allen Packages |
| `pnpm test` | Vitest-Unit-Tests (utils, validators, emails) |
| `pnpm build` | Nuxt-Build + API-Check |
| `pnpm storybook` / `pnpm storybook:build` | Storybook dev (Port 6006) / statischer Build |
| `pnpm e2e` | Playwright (startet api+web selbst; DB muss laufen; **leert die lokale DB**) |
| `pnpm db:up` / `db:migrate` / `db:seed` / `prisma:validate` | Datenbank |

## Storybook

`pnpm storybook` → alle 54 UI-Komponenten, Shop-/Admin-Komponenten sowie Showcases
(Typografie-Skala, Farbpalette, Spacing, Radius, Animationen, Dark/Light-Preview).
Theme-Umschalter in der Toolbar.

## Tests

- **Unit (Vitest):** Preis-/Versandlogik (6,99 € / frei ab 150 €), Statusmaschinen
  (Bestellung, Produktion, Reklamation, QC, Versand, Review, Social Posts),
  Kalender-Overlap, Filament-Bestand, Magic-Link-Token (nur Hash), Review-Eligibility,
  Popular-Configs, Bitcoin-2-Bestätigungen, Rechnungsnummern, Upload-Validierung,
  RBAC, Consent, Farbmapping, Social-Scheduler-Idempotenz und Meta-Error-Mapping.
- **E2E (Playwright, 31 Specs):** kompletter Kauf-, Upload-/Angebots-, Support-Ticket-,
  Reklamations-, QC-, Filament/AMS-, Produktionskalender-, Versand-, Kundenbereich-,
  Wunschlisten-, Konfigurator-, Review-, Admin-, Produktions-, Social-Planner-, Consent-,
  i18n-, Theme- und Accessibility-Flow. Details: [docs/testing.md](docs/testing.md)

## GitHub-Repo einrichten (falls nicht geschehen)

```bash
git init -b main && git add -A && git commit -m "initial"
gh repo create 3d-print-shop --public --source . --push
# ohne gh: Repo im Web-UI anlegen, dann
git remote add origin https://github.com/<user>/3d-print-shop.git && git push -u origin main
```

## Hinweise

- **Fonts:** Momo Trust Sans ist lizenzpflichtig und nicht enthalten. WOFF2-Dateien nach
  `apps/web/public/fonts/` legen und die `@font-face`-Blöcke in
  `packages/config/tailwind/fonts.css` einkommentieren. Bis dahin greift der System-Fallback.
- **3D-Modelle:** GLB-Upload direkt im Admin (`/admin/products/<id>` → „3D-Modell“) — Ablage
  unter `UPLOAD_DIR/models/`, ausgeliefert über `GET /api/models/:filename`. Alternativ statisch
  unter `apps/web/public/models/<slug>.glb`. Meshes/Materialien nach Farbzonen benannt:
  `zone_1_main`, `zone_2_accent`, `zone_3_detail`, `zone_4_text`. Ohne GLB rendert der Viewer
  ein prozedurales Fallback-Modell mit denselben Zonen. STL eignet sich nicht für die farbige
  Web-Vorschau.
- **Resend (E-Mails):** ohne `RESEND_API_KEY` werden Mails im Dev-Modus geloggt
  (Konsole + `EmailLog`-Tabelle, einsehbar via `GET /api/dev/emails`). 16 Templates in
  `packages/emails`; Absenderdomain bei Resend verifizieren, dann Key in `.env` setzen.
- **Stripe:** ohne Keys Mock-Modus (Success-Seite mit „Zahlung simulieren"). Live-Betrieb:
  Keys setzen + Webhook registrieren — [docs/payments.md](docs/payments.md).
- **Bitcoin:** eigene Wallet, bezahlt ab 2 Blockbestätigungen. MVP nutzt einen Mock-Provider;
  Anbindung einer echten Blockchain-API: [docs/payments.md](docs/payments.md).
- **Social Media Planner:** Posts für Facebook-Seite & Instagram-Business direkt aus dem
  Admin planen (`/admin/social`). Ohne Meta-Credentials läuft der Mock-Provider; echtes
  Publishing über die offiziellen Graph APIs per `SOCIAL_PUBLISHING_PROVIDER=meta` +
  `META_*`-Env-Vars — [docs/social-media-planner.md](docs/social-media-planner.md).
- **DSGVO/Consent:** Tracking lädt ausschließlich nach Opt-in —
  [docs/privacy-consent.md](docs/privacy-consent.md).
- **SEO:** `NUXT_PUBLIC_SITE_URL` auf die Produktions-Domain setzen — steuert Canonical,
  hreflang, `og:url` und die Sitemap. `robots.txt` + `sitemap.xml` werden von Nitro-Routen
  generiert (`apps/web/server/routes/`), Seiten-Metadaten über `useSeo()`
  (`apps/web/app/composables/useSeo.ts`), OG-Default-Bild: `apps/web/public/og-default.png`.
  Produktseiten nutzen `seoTitle`/`seoDescription` aus den Produkt-Übersetzungen (Admin-UI).
- **Deployment (Hostinger VPS):** [docs/deployment-hostinger.md](docs/deployment-hostinger.md).

## Dokumentation

[architecture](docs/architecture.md) · [design-system](docs/design-system.md) ·
[database](docs/database.md) · [api](docs/api.md) · [testing](docs/testing.md) ·
[payments](docs/payments.md) · [production-workflow](docs/production-workflow.md) ·
[quality-control](docs/quality-control.md) · [filament-ams](docs/filament-ams.md) ·
[shipping](docs/shipping.md) · [complaints](docs/complaints.md) ·
[customer-portal](docs/customer-portal.md) · [reviews](docs/reviews.md) ·
[support](docs/support.md) · [privacy-consent](docs/privacy-consent.md) ·
[social-media-planner](docs/social-media-planner.md) ·
[deployment-hostinger](docs/deployment-hostinger.md)

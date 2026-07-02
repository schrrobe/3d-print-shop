# Architektur

## Überblick

Monorepo (pnpm workspaces + Turborepo) mit drei Apps und sechs Packages:

```
apps/web    Nuxt 4 (Vue 3, SSR) — Shop + Adminbereich
apps/api    Express 5 + Prisma — REST-API, Zahlungen, Rechnungen, E-Mails
apps/e2e    Playwright — End-to-End-Tests gegen web + api

packages/config      ESLint-/TS-Presets + Design-Tokens (Tailwind-4-Theme, CSS)
packages/types       Shared Domain-Typen & Enums (Quelle der Wahrheit, vom Prisma-Schema gespiegelt)
packages/validators  Zod-Schemas (von web UND api verwendet)
packages/utils       Pure Domänenlogik (Preise, Versand, Statusmaschinen, RBAC, …) — Vitest-getestet
packages/emails      E-Mail-Template-Renderer (10 Templates, de/en + en-Fallback)
packages/ui          35 wiederverwendbare Vue-Komponenten (Radix Vue) + Storybook
```

Interne Packages werden als **TypeScript-Quellcode** konsumiert (kein Build-Schritt):
Nuxt/Vite transpilieren sie direkt (`build.transpile`), die API läuft über `tsx`.

## Request-Fluss

```
Browser ──> Nuxt (3000) ──/api/**-Proxy──> Express (3001) ──Prisma──> PostgreSQL (Docker)
                                              │
                                              ├── StripeService (echt oder Mock)
                                              ├── BitcoinProvider (Interface, Mock im MVP)
                                              ├── EmailService (Resend oder Dev-Log → EmailLog)
                                              └── PDF-Rechnungen (pdfkit → INVOICE_DIR)
```

Der Nuxt-Dev-Server proxied `/api/**` nach `localhost:3001` (nitro devProxy + routeRules).
In Produktion übernimmt ein Reverse Proxy (siehe `deployment-hostinger.md`) dieselbe Aufgabe.

## Wichtige Entscheidungen

- **Warenkorb client-seitig** (Pinia + localStorage). Die `Cart`/`CartItem`-Tabellen existieren
  im Schema für spätere serverseitige Warenkörbe; der Checkout validiert alle Preise und
  Farbwahlen serverseitig neu und erstellt direkt `Order` + `OrderItem`.
- **Gastbestellung**: Bestellzugriff über `orderNumber` + `accessToken` (zufälliges Token,
  in Bestätigungs-E-Mail/URL) statt Kundenkonten.
- **Statusmaschinen** für Bestellungen und Druckaufträge liegen in `packages/utils` und werden
  von der API erzwungen (`assertOrderTransition`, HTTP 409 bei ungültigen Übergängen).
- **Zahlungsabstraktion**: Alle drei Wege münden in `markOrderPaid()` (Order → paid,
  Rechnung + PDF, Produktionsjobs, E-Mails) — idempotent für Webhook-Retries.
- **3D-Viewer-Fallback**: Da keine GLB-Binärdateien im Repo liegen, rendert der Viewer ein
  prozedurales Modell mit denselben Farbzonen-Namen (`zone_1_main` …). Echte GLBs unter
  `apps/web/public/models/<slug>.glb` werden automatisch geladen.
- **Dev-Endpunkte** (`/api/dev/*`: Stripe-Mock abschließen, Bitcoin-Confirmations simulieren,
  EmailLog einsehen) sind nur außerhalb von `NODE_ENV=production` gemountet.

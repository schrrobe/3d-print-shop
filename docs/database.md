# Datenbank

PostgreSQL 16 (Docker: `docker compose up -d db`) + Prisma 6.
Schema: `apps/api/prisma/schema.prisma` · Seed: `apps/api/prisma/seed.ts`.

## Befehle

```bash
pnpm db:up                 # Postgres starten
pnpm db:migrate            # prisma migrate dev
pnpm db:seed               # Beispieldaten
pnpm prisma:validate       # Schema validieren
pnpm --filter @print-shop/api prisma:reset-data   # Tabellen leeren (Test-Fixture)
```

## Modelle (24)

**Auth/RBAC**: `User`, `Role`, `Permission` (m:n), `PasswordResetToken`.
Rollen: admin, product_manager, production, shipping, support — Rechtematrix in
`packages/utils/src/rbac.ts`, per Seed in die DB gespiegelt.

**Katalog**: `Product` (+ `ProductTranslation` je Locale, `ProductAsset` [image | glb_preview |
production_file], `ProductColorSlot` [max. 4 Zonen: zone_1_main … zone_4_text]), `Color`
(globale Farbliste: Name, Hex, Material, Hersteller, aktiv, Lagerbestand, AMS-Slot).

**Kauf**: `Cart`/`CartItem` (für spätere Server-Warenkörbe), `Order` (Gast-Zugriff via
`accessToken`, Adresse flach, Beträge in Cents), `OrderItem` (Namens-/Preis-Snapshot).

**Zahlung**: `Payment` (stripe | stripe_payment_link | bank_transfer | bitcoin),
`BitcoinPayment` (Adresse, expectedSats/receivedSats als BigInt, confirmations,
paid ab ≥ 2 Bestätigungen).

**Angebote**: `QuoteRequest` (Upload-Anfrage + Status), `UploadedFile` (.stl/.3mf, ≤ 50 MB,
Pfad außerhalb des Repos), `Quote` (Token für öffentliche Angebotsseite, validUntil, → Order).

**Produktion**: `Printer` (Status: idle/prepared/printing/paused/error/maintenance),
`PrinterJob` (Produktionsstatus: waiting → assigned → printing → printed → quality_check →
ready_to_ship → shipped, plus failed/reprint_needed; Druckzeit für ETA), `FilamentSpool`
(AMS-Slot-Dokumentation).

**Rechnungen**: `Invoice` (fortlaufende Nummer `RE-<Jahr>-<5-stellig>`, `@@unique([year, sequence])`),
`InvoiceCounter` (eine Zeile pro Jahr; Inkrement in Transaktion → keine Duplikate).

**Protokolle**: `EmailLog` (sent | dev_logged | failed), `ConsentLog` (DSGVO-Einwilligungen,
anonyme ID, Version), `AdminAuditLog` (alle Admin-Mutationen).

## Konventionen

- Alle Geldbeträge als **Integer-Cents**; Bitcoin in **Satoshi (BigInt)**.
- Enum-Werte englisch snake_case; deutsche Labels via i18n im Frontend.
- Statusübergänge werden nicht von der DB, sondern von den Statusmaschinen in
  `packages/utils` erzwungen (API antwortet 409 bei ungültigen Übergängen).

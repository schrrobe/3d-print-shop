# Datenbank

PostgreSQL 16 (Docker: `docker compose up -d db`) + Prisma 6.
Schema: `apps/api/prisma/schema.prisma` · Seed: `apps/api/prisma/seed.ts`.

## Befehle

```bash
pnpm db:up                 # Postgres starten
pnpm db:migrate            # prisma migrate dev
ALLOW_DEMO_SEED=true pnpm db:seed  # Beispieldaten (nur Entwicklung/CI)
pnpm prisma:validate       # Schema validieren
ALLOW_DATABASE_RESET=true NODE_ENV=test pnpm --filter @print-shop/api prisma:reset-data
```

## Migrationen

Zwei harte Regeln, beide aus Vorfällen entstanden:

**1. Kein `CREATE INDEX CONCURRENTLY` in einer Migration.** `prisma migrate deploy`
kapselt jede Migration in eine Transaktion, `CONCURRENTLY` ist dort verboten
(Postgres `25001`) — der Deploy bricht ab. Für einen Index auf einer Tabelle, die
dieselbe Migration erst anlegt, ist ein concurrent Build ohnehin sinnlos. Wenn ein
Index auf einer großen, produktiven Tabelle wirklich concurrent gebaut werden muss:
außerhalb von Prisma per Hand ausführen und die Migration mit `migrate resolve`
als angewendet markieren.

**2. Eine bereits angewendete Migration nie editieren.** Prisma speichert eine
Checksum je Migration in `_prisma_migrations`. Wird die `migration.sql` danach
geändert, scheitert jeder weitere `migrate deploy` in Umgebungen, die die alte
Fassung angewendet haben (`P3009`/Checksum-Mismatch) — auch dann, wenn die
Änderung inhaltlich korrekt war. Der reguläre Weg ist eine **neue** Migration.

### Bekannter Fall: `20260703145204_add_complaints_qc_filament_calendar_shipping_portal_reviews`

In PR #14 wurde in dieser (schon veröffentlichten) Migration ein
`CREATE INDEX CONCURRENTLY` auf `PrinterJob(printerId, plannedStartAt)` in ein
normales `CREATE INDEX` geändert, weil Regel 1 sonst jeden Deploy blockiert hat.
Neu aufgesetzte Umgebungen sind korrekt. Umgebungen, die die Migration **vor**
diesem Commit angewendet haben, tragen die alte Checksum und laufen beim nächsten
`migrate deploy` rot.

Betroffen? Prüfen:

```bash
pnpm --filter @print-shop/api exec prisma migrate status
```

Meldet der Befehl für diese Migration einen geänderten Inhalt, die Checksum auf den
aktuellen Dateistand ziehen — der Index existiert in der DB bereits, es wird also
kein SQL nachgezogen:

```bash
# Angewendet-Markierung zurücknehmen und mit dem neuen Dateistand neu setzen.
pnpm --filter @print-shop/api exec prisma migrate resolve \
  --rolled-back 20260703145204_add_complaints_qc_filament_calendar_shipping_portal_reviews
pnpm --filter @print-shop/api exec prisma migrate resolve \
  --applied 20260703145204_add_complaints_qc_filament_calendar_shipping_portal_reviews
```

Danach `prisma migrate status` erneut ausführen: es muss „Database schema is up to
date" melden, bevor deployt wird. Vorher ein Backup ziehen — `migrate resolve`
schreibt in `_prisma_migrations`.

## Modelle

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

**Support**: `Ticket` (fortlaufende `ticketNumber` `TIC-<Jahr>-<5-stellig>` via `TicketCounter`,
`accessToken` für den öffentlichen Thread, Status/Priorität/Kategorie, optionale Order-
und Bearbeiter-Verknüpfung), `TicketMessage` (customer/staff-Thread). Details:
[support.md](./support.md).

**Reklamationen**: `Complaint` (`REK-<Jahr>-<5-stellig>` via `ComplaintCounter`, `accessToken`,
Status/Grund, optionale Ticket-Verknüpfung), `ComplaintItem`, `ComplaintAttachment`
(privat), `ComplaintDecision` (Ersatzdruck/Erstattung/Gutschein/Ablehnung). Details:
[complaints.md](./complaints.md).

**Qualitätskontrolle**: `QcRecord` (6-Punkte-Checkliste je Prüfversuch = Historie),
`QcAttachment` (privat). Details: [quality-control.md](./quality-control.md).

**Filament/AMS**: `FilamentSpool` (erweitert: Mindestbestand, Nachbestell-Flag),
`AmsUnit` + `AmsSlot` (Bambu-Lab-AMS-Zuordnung); `Color` erweitert um `minStockGrams`/
`outOfStock`. Details: [filament-ams.md](./filament-ams.md).

**Produktionskalender**: `PrinterJob.plannedStartAt/plannedEndAt`, `MaintenanceWindow`
(Wartungsfenster je Drucker). Details: [production-workflow.md](./production-workflow.md).

**Versand**: `Shipment` (`VER-<Jahr>-<5-stellig>` via `ShipmentCounter`), `ShipmentItem`,
`ShipmentStatusEvent` (Historie). Details: [shipping.md](./shipping.md).

**Kundenbereich**: `MagicLinkToken` (nur SHA-256-Hash, 30 Tage, max. 3 aktiv/E-Mail),
`PortalAccessLog`. Details: [customer-portal.md](./customer-portal.md).

**Konfigurator/Reviews**: `SavedConfiguration` (dedupliziert, stabiler `shareToken`),
`Review` (eine je Bestellposition, moderiert). Details: [reviews.md](./reviews.md).

**Protokolle**: `EmailLog` (sent | dev_logged | failed), `ConsentLog` (DSGVO-Einwilligungen,
anonyme ID, Version), `AdminAuditLog` (alle Admin-Mutationen).

## Konventionen

- Alle Geldbeträge als **Integer-Cents**; Bitcoin in **Satoshi (BigInt)**.
- Enum-Werte englisch snake_case; deutsche Labels via i18n im Frontend.
- Statusübergänge werden nicht von der DB, sondern von den Statusmaschinen in
  `packages/utils` erzwungen (API antwortet 409 bei ungültigen Übergängen).

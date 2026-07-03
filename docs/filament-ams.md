# Filament- & AMS-Verwaltung

Bestandsführung für Filamentspulen und manuelle Zuordnung zu Bambu-Lab-AMS-Einheiten
(AMS 2 Pro: bis zu 4 Einheiten × 4 Slots).

## Datenmodell

- **FilamentSpool** (erweitert) — `manufacturer?`, `label?`, `totalGrams?`,
  `remainingGrams`, `minRemainingGrams?`, `storageLocation?`, `active`, `reorder`.
  Die alten Felder `printerId`/`amsSlot` sind als *deprecated* markiert; die AMS-Zuordnung
  läuft jetzt über `AmsSlot`.
- **AmsUnit** — `printerId` (Cascade), `name`, `position`; `@@unique([printerId, position])`.
- **AmsSlot** — `amsUnitId`, `slotIndex` 1–4, `status` (`empty`/`loaded`/`low`/`error`/
  `disabled`), `spoolId?` **@unique** (eine Spule passt in genau einen Slot).
- **Color** (erweitert) — `minStockGrams?`, `outOfStock` (Badge „aktuell nicht
  verfügbar"; `active=false` versteckt die Farbe komplett).

## Bestands-Helfer (`packages/utils/src/filament.ts`, pure & getestet)

- `spoolBelowMinimum(spool)` — `remainingGrams < minRemainingGrams`.
- `spoolNeedsReorder(spool)` — manuell markiert **oder** unter Minimum (inaktive Spulen nie).
- `colorStockStatus(minStockGrams, spoolRemainingGrams[])` → `ok | low | unknown` — Summe
  aller aktiven Spulen einer Farbe gegen deren Mindestbestand.

## Warnungen & Einkaufsliste

- `GET /api/admin/filament/alerts` — Spulen unter Minimum + Farben mit niedrigem
  Gesamtbestand.
- `GET /api/admin/filament/shopping-list` — nachbestellungspflichtige Spulen.
- `POST /api/admin/filament/colors/:colorId/availability` — Farbe im Shop deaktivieren
  oder als „nicht verfügbar" markieren (`colors:write`, auditiert). Das öffentliche
  Colors-DTO liefert `outOfStock` mit, sodass der Shop den Zustand sofort anzeigt.

## AMS-Verwaltung

- `GET/POST/DELETE /api/admin/filament/ams-units` — beim Anlegen entstehen automatisch
  4 leere Slots.
- `PATCH /api/admin/filament/ams-slots/:id` — Spule laden/entladen, Status, Notizen.
  Eine bereits belegte Spule in einem zweiten Slot laden → `409`.

## Endpunkte (Spulen-CRUD)

`GET/POST /api/admin/filament/spools`, `PATCH/DELETE /api/admin/filament/spools/:id`
(Löschen blockiert, solange die Spule einem Slot zugeordnet ist).

## RBAC

`filament:read` / `filament:write` — production (+ product_manager liest).

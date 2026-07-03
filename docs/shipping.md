# Paket- & Versandverwaltung

Sendungen bündeln Bestellpositionen, durchlaufen eine eigene Statuskette und schreiben
Tracking/Versanddatum zentral zurück auf die Bestellung. Versanddienstleister werden
intern gewählt (DHL / Hermes).

## Datenmodell

- **Shipment** — `shipmentNumber` (`VER-2026-00001`, `ShipmentCounter`), `orderId`,
  `status`, `carrier?`, `trackingNumber?`, `packedAt?`/`shippedAt?`/`deliveredAt?`,
  `weightGrams?`, `packingListPdfPath?`, `deliveryNotePdfPath?`.
- **ShipmentItem** — `@@unique([shipmentId, orderItemId])`; Teillieferungen erlaubt (Σ
  Menge über alle nicht-`problem`-Sendungen ≤ bestellte Menge, sonst `409`).
- **ShipmentStatusEvent** — die Versandhistorie (`fromStatus`, `toStatus`, `byUserId`,
  `note`).

## Statusmaschine (`packages/utils/src/shipment-status.ts`)

```
waiting_for_qc ─> ready_for_shipping | problem
ready_for_shipping ─> packed | problem
packed ─> shipped | ready_for_shipping | problem
shipped ─> delivered | problem
delivered (terminal)
problem ─> waiting_for_qc | ready_for_shipping | packed | shipped
```

`waiting_for_qc → ready_for_shipping` ist QC-gegated (siehe
[quality-control.md](quality-control.md)).

## Single-Writer-Regel

`shipShipment()` ist die **einzige** Stelle, die `Order.carrier`, `Order.trackingNumber`,
`Order.shippedAt` und den Bestellstatus auf `shipped` schreibt. Alles in einer
Transaktion: Sendung → `shipped`, Bestellung → `shipped`, versandfähige Jobs → `shipped`,
StatusEvent, danach Versandbestätigung (`shipping_confirmation`). Das verhindert Drift
zwischen Bestellung und Sendung.

Die Alt-Route `POST /api/admin/orders/:id/shipping` bleibt als dünner Wrapper erhalten:
Sie legt (falls nötig) eine implizite Sendung an (`packed`, Event-Notiz `legacy-route`)
und ruft denselben `shipShipment()`-Service — identisches Außenverhalten.

## PDFs

Packliste und Lieferschein werden mit PDFKit erzeugt (`INVOICE_DIR/shipping`,
regenerate-if-missing). Der Lieferschein trägt den Hinweis „kein Rechnungsdokument"; die
Packliste listet die Farbkonfiguration je Position.

## Endpunkte (Admin, RBAC + Audit)

- `GET /api/admin/shipments`, `POST /api/admin/shipments` (`{ orderId, items[] }`).
- `GET /api/admin/shipments/:id` — inkl. `statusEvents` + QC-Clearance je Job.
- `POST /api/admin/shipments/:id/status` — Statusmaschine inkl. QC-Gate.
- `POST /api/admin/shipments/:id/ship` — `orders:ship`, `{ carrier, trackingNumber }`.
- `GET /api/admin/shipments/:id/packing-list.pdf` / `…/delivery-note.pdf`.

## Versandkosten

Unverändert: 6,99 € pauschal, versandkostenfrei ab 150 € (`packages/utils/src/shipping.ts`).

## RBAC

`shipments:read` / `shipments:write` — shipping (+ production/support lesen); das
eigentliche Versenden erfordert `orders:ship`.

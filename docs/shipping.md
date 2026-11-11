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

## Single-Writer-Regel

`shipShipment()` ist die **einzige** Stelle, die `Order.carrier`, `Order.trackingNumber`,
`Order.shippedAt` und den Bestellstatus auf `shipped` schreibt. Alles in einer
Transaktion: Sendung → `shipped`, Bestellung → `shipped`, versandfähige Jobs → `shipped`,
StatusEvent, danach Versandbestätigung (`shipping_confirmation`). Das verhindert Drift
zwischen Bestellung und Sendung. Steht noch ein Druckjob der Bestellung nicht auf
`ready_to_ship` (oder `shipped`), lehnt `shipShipment()` mit `409` ab — sonst bliebe er
aktiv und zuweisbar in der Produktions-Queue.

Die Alt-Route `POST /api/admin/orders/:id/shipping` bleibt als dünner Wrapper erhalten:
Sie legt (falls nötig) eine implizite Sendung an (`packed`, Event-Notiz `legacy-route`)
und ruft denselben `shipShipment()`-Service — identisches Außenverhalten.

## PDFs

Packliste und Lieferschein werden mit PDFKit erzeugt (`INVOICE_DIR/shipping`,
regenerate-if-missing). Der Lieferschein trägt den Hinweis „kein Rechnungsdokument"; die
Packliste listet die Farbkonfiguration je Position.

## Endpunkte (Admin, RBAC + Audit)

- `GET /api/admin/shipments`, `POST /api/admin/shipments` (`{ orderId, items[] }`).
- `GET /api/admin/shipments/:id` — inkl. `statusEvents`.
- `POST /api/admin/shipments/:id/status` — Statusmaschine.
- `POST /api/admin/shipments/:id/ship` — `orders:ship`, `{ carrier, trackingNumber }`.
- `GET /api/admin/shipments/:id/packing-list.pdf` / `…/delivery-note.pdf`.

## Versandkosten

Deutschland 6,99 €, frei ab 80 €; Ausland 15,00 €, frei ab 100 €; ab 150 € wählt der Kunde im Checkout eine 50er Box gratis (0-€-Position, `packages/utils/src/shipping.ts`).

## RBAC

`shipments:read` / `shipments:write` — shipping (+ production/support lesen); das
eigentliche Versenden erfordert `orders:ship`.

## DHL-Versandlabel (Bestelldetailseite)

DHL Parcel DE Shipping API v2 (`services/dhl.ts`), Zugang über `DHL_*` (siehe
`.env.example`; Sandbox-Defaults für die Abrechnungsnummern). Ohne Zugangsdaten
antwortet die Route mit `503`.

- **Ablauf:** Gewicht eingeben → „DHL-Label erstellen“. Gilt immer für die ganze
  Bestellung: dieselbe implizite Sendung wie die Alt-Route (`packedShipmentFor()`,
  Event-Notiz `dhl-label`; offene Sendung → `409`). Die Sendungsnummer landet in
  `Shipment.carrier/trackingNumber`, das PDF unter `INVOICE_DIR/shipping`
  (`Shipment.labelPdfPath`); das Versandformular wird vorbefüllt. Versendet wird
  weiterhin erst mit „Versand bestätigen“ (`shipShipment()`, Versand-Mail).
- **Format:** PDF 103×150 mm (`910-300-410`, Thermo-Rolle), Druck über den
  Browser-Druckdialog. Bei CH und IS ist die Zollinhaltserklärung (CN23) im selben PDF.
- **Produkte:** `V01PAK` für DE, `V53WPAK` für alle anderen Lieferländer (`SHIPPING_COUNTRIES`).
  CH/IS (außerhalb der EU-Zollunion): CN23 automatisch aus den Positionen, HS-Code `39269097`, Ursprung DE,
  `COMMERCIAL_GOODS`; Gratis-Box mit 0,01 € deklariert.
- **Daten an DHL:** Name, Firma, Lieferadresse (`street` unverändert), Gewicht,
  Bestellnummer. Die E-Mail nur mit Checkout-Opt-in (`Order.carrierEmailConsentAt`,
  ADR 0001). Kein Telefon.
- **Storno:** solange die Sendung `packed` ist (`DELETE …/dhl-label`, bei DHL bis
  zum Tagesabschluss). Danach kann neu erstellt werden. Versenden mit einer anderen
  Sendungsnummer als der des aktiven Labels lehnt die Alt-Route mit `409` ab.
- **Timeout:** 30 s je DHL-Aufruf, dann `504`. Das Label kann bei DHL trotzdem
  entstanden sein — vor erneutem Versuch im Geschäftskundenportal prüfen
  (Referenz = Bestellnummer).
- **Erneut drucken:** `GET …/dhl-label.pdf` liefert das letzte Label (auch nach Versand).
- Fehler/Warnungen von DHL (z. B. nicht kodierbare Adresse) erscheinen als Toast;
  ein Label mit Warnung ist gültig.

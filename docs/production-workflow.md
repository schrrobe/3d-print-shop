# Produktions-Workflow

## Vom Auftrag zum Versand

```
Zahlung eingegangen (markOrderPaid)
  └─> je OrderItem ein PrinterJob (Status: waiting) in der Produktionsqueue

Admin/Produktion (Rolle production):
  waiting ── zuweisen (Drucker + Druckzeit + AMS-Notiz) ──> assigned   [Drucker → prepared]
  assigned ──> printing                                              [Drucker → printing]
  printing ──> printed                                               [Drucker → idle]
  printed ──> quality_check
  quality_check ──> [QC-Gate] ──> ready_to_ship  oder  reprint_needed (→ waiting, Drucker frei)
  printing ──> failed (→ reprint_needed)

Admin/Versand (Rolle shipping): Sendung (Shipment) statt Order-Direktversand
  waiting_for_qc ──[QC-Gate]──> ready_for_shipping ──> packed ──> shipped ──> delivered
  ──> shipShipment(): Order shipped + Carrier (DHL/Hermes) + Tracking, Versand-E-Mail
```

Der Kunde wählt den Versanddienstleister **nicht** selbst; DHL/Hermes wird intern gesetzt.

## QC-Gate & Versand

Vor `ready_to_ship` (Job) bzw. `ready_for_shipping` (Sendung) erzwingt das System eine
bestandene Qualitätsprüfung — sonst `409`. Details: [quality-control.md](./quality-control.md).
Der eigentliche Versand läuft über das Sendungsmodell mit Historie und PDF-Dokumenten
(Packliste/Lieferschein); `shipShipment()` ist der einzige Schreiber für
`Order.carrier/trackingNumber/shippedAt`. Details: [shipping.md](./shipping.md).

## Produktionskalender

`PrinterJob.plannedStartAt/plannedEndAt` (UTC) planen Jobs je Drucker; `MaintenanceWindow`
blockt Zeiträume. `GET /api/admin/production/calendar?from&to` liefert Jobs + Wartungen +
Drucker; `POST /api/admin/production/:jobId/schedule` erkennt Überlappungen (halboffene
Intervalle) und antwortet `409` mit Konfliktliste, sofern nicht `force: true` gesetzt wird
(auditiert). Anzeige lokal, Speicherung UTC.

## Reklamations-Ersatzdruck

Eine Reklamations-Entscheidung `replacement_print` erzeugt je betroffener Position einen
`PrinterJob` (Status `waiting`) in der Queue — ohne den Bestellstatus zu verändern. Details:
[complaints.md](./complaints.md).

## Drucker (MVP: Bambu Lab X1C + AMS 2 Pro)

- Keine automatische Druckersteuerung — Drucker werden manuell angelegt und gepflegt.
- Druckerstatus: `idle` (frei) · `prepared` (vorbereitet) · `printing` (druckt) ·
  `paused` (pausiert) · `error` (fehler) · `maintenance` (wartung).
  Zuweisung/Start/Ende von Jobs synchronisiert den Druckerstatus automatisch.
- **ETA**: Summe der hinterlegten Druckzeiten aller offenen Jobs je Drucker
  (`calcPrinterEtaMs`, angezeigt in der Queue).
- **AMS-/Spulenbelegung**: `FilamentSpool` dokumentiert Slot ↔ Farbe ↔ Material ↔ Restmenge
  (Pflege unter Admin → Drucker); zusätzlich Freitext `spoolNotes` am Job.

## Upload-Anfragen (Kundenmodelle)

1. Kunde lädt `.3mf`/`.stl` (≤ 50 MB) hoch + Kontaktdaten/Beschreibung → `QuoteRequest (new)`.
2. Produktion prüft (`in_review`) oder lehnt ab (`rejected`).
3. Angebot erstellen (Preis inkl. Versand, Gültigkeit) → E-Mail mit Angebotslink (`quoted`).
4. Kunde nimmt an → Bestellung + Stripe-Zahlungslink (`accepted`).
5. Nach Zahlungseingang läuft der normale Produktionsworkflow.

Die Upload-Seite verlangt die Zustimmung zu den versionierten Upload-Bedingungen;
`acceptedUploadTerms` und `uploadTermsVersion` werden mit der Anfrage gespeichert.

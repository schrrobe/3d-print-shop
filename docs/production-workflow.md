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
  quality_check ──> ready_to_ship  oder  reprint_needed (→ waiting, Drucker freigegeben)
  printing ──> failed (→ reprint_needed)

Admin/Versand (Rolle shipping):
  Bestellung ready_to_ship + Carrier (DHL/Hermes) + Trackingnummer
  ──> Order: shipped, Versand-E-Mail an Kunden
```

Der Kunde wählt den Versanddienstleister **nicht** selbst; DHL/Hermes wird intern gesetzt.

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

Rechtliche Upload-Bedingungen sind bewusst noch nicht implementiert — Platzhalter auf der
Upload-Seite (`upload.termsPlaceholder`) und Feld `acceptedUploadTerms` im Schema existieren.

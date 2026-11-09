# Externe Fertigung (Druckanbieter)

Bestellungen können **als Ganzes** an externe Druckanbieter vergeben werden. Der
Anbieter bekommt eine E-Mail mit PDF-Fertigungsauftrag und einen vereinbarten
Prozentsatz vom Warenwert. Kein Login, kein Portal — den Fortschritt pflegt das
Team im Admin.

## Modell

- **PrintProvider** — Name, Ansprechperson, E-Mail, `defaultRateBp` (Basispunkte,
  1500 = 15 %), Notiz, `active`. Anbieter mit Aufträgen werden nur deaktiviert.
- **ProviderAssignment** — Bestellung ↔ Anbieter. `rateBp`, `baseCents`,
  `payoutCents` werden **beim Vergeben eingefroren** (Satzänderungen am Anbieter
  wirken nur auf neue Aufträge). Höchstens ein nicht-stornierter Auftrag je
  Bestellung (partieller Unique-Index); Historie bleibt erhalten.
- **Warenwert** = `subtotal − discount − prepaymentDiscount`, ohne Versand —
  identisch zur Provisionsbasis der Verkaufskanäle. Kleinunternehmer (§19 UStG):
  keine Brutto/Netto-Unterscheidung. Rundung wie `commissionFor` (half-up).

## Ablauf

```
paid | in_production, kein Job ab printing
  └─ vergeben ──> assigned   Bestellung → in_production, Jobs → waiting (Drucker frei),
                             Jobs verschwinden aus Queue/Kalender, Mail + PDF an Anbieter
assigned ──> completed       Direktversand: Jobs + Bestellung → ready_to_ship
completed ──> received       (nur Lieferung an uns) Jobs + Bestellung → quality_check
assigned ──> cancelled       Storno-Mail, Jobs erscheinen wieder in der internen Queue
                             (auch automatisch, wenn die Bestellung storniert/erstattet wird)
```

Neu vergeben (solange `assigned`) storniert den alten Auftrag automatisch. Schlägt
eine Storno-Mail fehl, warnt das Admin (Anbieter direkt informieren); im Audit-Log
steht `cancelEmailSent: false`.

Solange der Auftrag offen ist (bzw. bei Lieferung an uns noch nicht eingegangen),
lehnen Bestellstatus `quality_check`/`ready_to_ship` und der Versand mit 409 ab.
Versand läuft unverändert über `shipShipment()` — bei Direktversand trägt das
Team die Sendungsnummer des Anbieters im normalen Versandformular ein.

## PDF / Mail

PDF (pdfkit, nur Deutsch) wird bei jedem Versand neu erzeugt und **nicht
gespeichert**: Positionen mit Farben/Personalisierung und Verkaufspreisen,
Artikelsumme, Rabatte, Warenwert, Satz, Vergütung, optionaler Hinweis.

**Direktversand** (Häkchen „Kundendaten mitsenden“): nur Name, Firma und
Lieferadresse — keine E-Mail, kein Telefon. Die Weitergabe wird am Auftrag
(`shareCustomerData`) und im Audit-Log festgehalten. Voraussetzung: AV-Vertrag
mit dem Anbieter (organisatorisch).

Antwortadresse und BCC: Firmen-E-Mail. „Auftrag erneut senden“ im Bestelldetail.

## Abrechnung

- Vergütung zählt ab `completed` (auch wenn die Bestellung später erstattet wird).
- `payoutCents` manuell korrigierbar, `paidOutAt` je Auftrag oder gesammelt
  („Offene im Zeitraum als ausgezahlt“, gleicher Zeitraum wie die Anzeige) — jeweils auditiert.
- Übersicht `/admin/providers`: Zeitraum (nach Vergabedatum), Warenwert extern,
  Vergütung, eigener Anteil, offene Auszahlungen, Anteil am Shop-Umsatz.

## Rechte

| Recht                   | Rollen            | Wofür                                           |
| ----------------------- | ----------------- | ----------------------------------------------- |
| `providers:read/write`  | admin             | Anbieter, Sätze, Beträge, Übersicht, Auszahlung |
| `provider-orders:write` | admin, production | vergeben, Status pflegen, erneut senden         |

`production` sieht am Auftrag Anbieter und Status, aber keine Beträge, und kann
den Satz nicht überschreiben.

## Bewusst nicht enthalten

Anbieter-Portal, Aufteilen nach Positionen, Diagramme, Gutschriften. Ersatzdrucke
aus Reklamationen laufen intern.

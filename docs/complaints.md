# Reklamationen (Retouren-/Reklamationsmodul)

Kunden eröffnen Reklamationen zu einer Bestellung; das Team prüft, kommuniziert und
entscheidet. Personalisierte Sonderanfertigungen (`Product.customMade`) sind vom
Widerruf ausgeschlossen — Reklamationen bei Mängeln und Kulanz bleiben möglich; der
Hinweis erscheint direkt im Formular.

## Datenmodell

- **Complaint** — `complaintNumber` (`REK-2026-00001`, `ComplaintCounter` pro Jahr),
  `accessToken` (kundenseitiger Token, wie bei Bestellungen), `orderId`, `status`,
  `reason`, `description`, `internalNote` (nie öffentlich), optional `ticketId`.
- **ComplaintItem** — betroffene Bestellpositionen (`@@unique([complaintId, orderItemId])`).
- **ComplaintAttachment** — Fotos, `uploadedBy` = `customer` | `staff`, `storedPath`
  privat (siehe unten).
- **ComplaintDecision** — mehrere pro Fall (further-review-Schleifen): `resolution`,
  `refundAmountCents?`, `voucherCode?`, `reprintJobId?` (verknüpfter Ersatzdruck),
  `decidedById`.

## Statusmaschine (`packages/utils/src/complaint-status.ts`)

```
submitted ─> in_review
in_review ─> info_needed | approved | rejected
info_needed ─> in_review
approved ─> replacement_planned | refund_planned | closed
rejected | replacement_planned | refund_planned ─> closed
closed (terminal)
```

Ungültige Übergänge liefern `409 invalid_transition`.

## Entscheidungen

`POST /api/admin/complaints/:id/decision` erfordert `complaints:decide` (nur Admin) und
ist nur aus `in_review` oder `approved` möglich. Mapping Resolution → Folgestatus:

| Resolution          | Folgestatus            | Nebeneffekt                                    |
| ------------------- | ---------------------- | ---------------------------------------------- |
| `replacement_print` | `replacement_planned`  | pro ComplaintItem ein `PrinterJob` (`waiting`) |
| `refund`            | `refund_planned`       | `refundAmountCents` Pflicht (> 0)              |
| `voucher`           | `approved`             | `voucherCode`                                  |
| `rejection`         | `rejected`             | —                                              |
| `further_review`    | `in_review`            | Fall bleibt offen                              |

Der Ersatzdruck landet als normaler Job in der Produktionsqueue (kein Bezug zum
Bestellstatus). Aus einem Fall lässt sich per `POST …/ticket` ein Support-Ticket
erzeugen oder ein bestehendes verknüpfen (`complaintNumber` als Betreff, Beschreibung
als erste Kundennachricht).

## Endpunkte

**Öffentlich** (Rate-Limit `sensitiveLimiter`, Order-Token-geprüft):

- `POST /api/complaints` — multipart (`items` als JSON-String, bis 5 Fotos), Auth über
  `orderNumber` + Order-`accessToken`. Antwort `{ complaintNumber, accessToken }`.
- `GET /api/complaints/:complaintNumber?token=` — Kundensicht (`complaintPublicDto`,
  ohne interne Notiz/Staff-Identitäten).
- `POST /api/complaints/:complaintNumber/reply?token=` — nur bei `info_needed`; hängt die
  Nachricht an und setzt den Fall zurück auf `in_review`.
- `GET /api/complaints/:complaintNumber/attachments/:id?token=` — Foto-Auslieferung.

**Admin** (`requireAuth` + RBAC, alles `audit()`-protokolliert): `GET /`, `GET /:id`,
`POST /:id/status`, `PATCH /:id` (interne Notiz), `POST /:id/decision`, `POST /:id/ticket`,
`POST /:id/photos`, `GET /:id/attachments/:id`.

## Sicherheit

- Reklamationsfotos liegen unter `UPLOAD_DIR/complaints` und werden **nie statisch**
  ausgeliefert — nur über ID-basierte, token-/permission-geprüfte Endpunkte
  (`storedPath` erscheint nie im JSON).
- Upload-Validierung: `.jpg/.jpeg/.png/.webp` + MIME-Prüfung, max. 10 MB, 5 Dateien.
- Kundensicht zeigt ausschließlich Daten der jeweiligen Reklamation.

## RBAC

`complaints:read` / `complaints:write` — support & (read) production; `complaints:decide`
ausschließlich Admin.

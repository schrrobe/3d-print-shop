# Support-Ticketsystem

Kunden erstellen Tickets ohne Account über `/support`; der Zugriff auf den eigenen
Ticket-Thread läuft — wie beim Angebots-Workflow — über einen Token-Link aus der
Bestätigungs-E-Mail (`/support/ticket/<token>`).

## Datenmodell

| Modell | Zweck |
|---|---|
| `Ticket` | Kopf: `ticketNumber` (TIC-JJJJ-00001), `accessToken`, Status, Priorität, Kategorie, Kundendaten, optionale Order- und Bearbeiter-Verknüpfung |
| `TicketMessage` | Thread-Nachricht (`authorType` customer/staff, Staff-Nachrichten mit `userId`) |
| `TicketCounter` | Jahresbasierter Zähler für fortlaufende Ticketnummern (atomarer Upsert, wie `InvoiceCounter`) |

Bestellverknüpfung: Beim Erstellen wird eine angegebene Bestellnummer nur verknüpft,
wenn sie existiert **und** die E-Mail-Adresse der Bestellung übereinstimmt. Andernfalls
wird das Ticket unverknüpft angelegt — nie mit 4xx abgelehnt, damit Bestellnummern/E-Mails
nicht enumerierbar sind.

## Statusmaschine

`packages/utils/src/ticket-status.ts`:

```
open ──────────→ in_progress | waiting_customer | resolved | closed
in_progress ───→ waiting_customer | resolved | closed
waiting_customer → in_progress | resolved | closed
resolved ──────→ in_progress (Reopen) | closed
closed          (terminal)
```

Automatik:
- Staff-Antwort auf `open` → `in_progress` (`statusAfterStaffReply`)
- Kundenantwort auf `waiting_customer`/`resolved` → `in_progress` (Reopen, `statusAfterCustomerReply`)
- Kundenantwort auf `closed` → HTTP 409, das Formular ist auf der Token-Seite ausgeblendet

## API

Public: `POST /api/tickets` (rate-limited), `GET /api/tickets/:token`,
`POST /api/tickets/:token/messages`.
Admin (`requireAuth` + Permission): `GET /api/admin/tickets` (Filter: status, priority,
assignedToId), `GET /api/admin/tickets/assignees`, `GET /api/admin/tickets/:id`,
`POST …/:id/messages`, `POST …/:id/status`, `PATCH …/:id` (Priorität/Kategorie/Zuweisung).
Alle Schreibaktionen landen im Audit-Log.

## RBAC

Neue Permissions `tickets:read` / `tickets:write`. `admin` und `support` haben beide;
`product_manager`, `production` und `shipping` haben keinen Ticketzugriff.
Seed-User für die Support-Rolle: `support@example.com` (Dev-Passwort wie Admin).

## E-Mails

| Template | Empfänger | Auslöser |
|---|---|---|
| `ticket_created` | Kunde | Ticket erstellt (mit Token-Link) |
| `ticket_reply` | Kunde | Staff-Antwort |
| `ticket_customer_reply` | Bearbeiter, sonst `ADMIN_NOTIFICATION_EMAIL` | Kundenantwort |

Ohne `RESEND_API_KEY` werden alle Mails geloggt (`EmailLog`, `GET /api/dev/emails`).

## Tests

- Vitest: `packages/utils/test/ticket-status.test.ts` (Statusmaschine, Reply-Automatik),
  RBAC- und Ticketnummern-Fälle in `rbac.test.ts` / `invoice-number.test.ts`
- Playwright: `apps/e2e/tests/support-tickets.spec.ts` (Formular→Token-Seite, Order-Matching,
  Admin-Antwort/Statuswechsel/Reopen/Schließen, RBAC mit Support-Login, 404, E-Mail-Log)

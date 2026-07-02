# Zahlungen

Drei Zahlungswege, alle münden in `markOrderPaid()` (`apps/api/src/services/order-flow.ts`):
Order → `paid`, Payment → `paid`, Rechnung (Nummer + PDF + E-Mail), Produktionsjobs (`waiting`),
E-Mails `payment_received` + `invoice`. Idempotent (Webhook-Retries sicher).

## Stripe

`apps/api/src/services/payments/stripe.ts`

- **Standardprodukte**: `POST /api/checkout` mit `paymentMethod: "stripe"` erstellt eine
  Checkout Session; Kunde wird zu Stripe (bzw. im Mock direkt zur Success-Seite) geleitet.
- **Upload-Angebote**: Angebotsannahme erstellt einen **Payment Link**.
- **Webhook** `POST /api/webhooks/stripe` verarbeitet `checkout.session.completed`
  (raw body, Signaturprüfung mit `STRIPE_WEBHOOK_SECRET`).

Ohne `STRIPE_SECRET_KEY` läuft der **Mock-Modus**: deterministische `mock_cs_*`-Sessions,
Abschluss über `POST /api/dev/stripe/complete/:sessionId` (nutzt die Success-Seite als
„Zahlung simulieren"-Button; Grundlage der E2E-Tests).

Echtbetrieb: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` setzen; Webhook-Endpoint
`https://<domain>/api/webhooks/stripe` im Stripe-Dashboard registrieren.

## Banküberweisung

Checkout mit `paymentMethod: "bank_transfer"` → Order-Status **`awaiting_bank_transfer`**,
Kunde sieht Bankdaten (aus `BANK_*`-env) inkl. Verwendungszweck = Bestellnummer.
Admin bucht den Zahlungseingang manuell: `POST /api/admin/orders/:id/mark-paid`
(Permission `payments:write`, auditiert).

## Bitcoin (eigene Wallet)

`apps/api/src/services/payments/bitcoin.ts`

- **Interface `BitcoinProvider`**: `createReceiveAddress()`, `getAddressStatus(address)`
  → `{receivedSats, confirmations, txId}`, `convertEurCentsToSats(cents)`.
- **Regel**: bezahlt bei `receivedSats ≥ expectedSats` **und** `confirmations ≥ 2`
  (`BITCOIN_REQUIRED_CONFIRMATIONS`, Logik in `packages/utils/src/bitcoin.ts`, unit-getestet).
- Sync: `POST /api/payments/bitcoin/:paymentId/sync` (von der Bestellstatus-Seite pollbar).

**MVP: `MockBitcoinProvider`** — Adressen `mock_bc1q…`, fester Dev-Kurs (1 € ≈ 1667 sats),
Kette wird über `POST /api/dev/bitcoin/:paymentId/advance` simuliert.

**Echte Anbindung** (`BITCOIN_PROVIDER=blockchain-api`, bewusst noch `throw`):
1. Adressableitung aus Watch-only-**xpub** (`BITCOIN_XPUB`) z. B. mit `@scure/btc-signer` —
   **niemals Private Keys** auf dem Server.
2. `getAddressStatus` gegen eigenen Node / Esplora (Blockstream) / mempool.space implementieren
   (Confirmations = aktuelle Blockhöhe − Tx-Blockhöhe + 1).
3. Live-EUR-Kurs (z. B. Kraken/CoinGecko) mit Zeitstempel + Toleranzfenster.
4. In `createBitcoinProvider()` registrieren; periodischen Sync (Cron) ergänzen.

## Rechnungen

`apps/api/src/services/invoice.ts` — fortlaufende Nummern `RE-<Jahr>-<00001>` über
`InvoiceCounter`-Transaktion (Race-sicher, pro Jahr neu ab 1), PDF via pdfkit nach
`INVOICE_DIR`, Download im Admin (`GET /api/admin/invoices/:id/pdf`), Versand per E-Mail-Anhang.
USt-Angaben sind Platzhalter → vor Livegang ergänzen.

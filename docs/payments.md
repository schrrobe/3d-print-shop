# Zahlungen

Vier Zahlungswege (Stripe, PayPal, Banküberweisung, Bitcoin), alle münden in `markOrderPaid()` (`apps/api/src/services/order-flow.ts`):
Order → `paid`, Payment → `paid`, Rechnung (Nummer + PDF + E-Mail), Produktionsjobs (`waiting`),
E-Mails `payment_received` + `invoice`. Idempotent (Webhook-Retries sicher).

## Stripe

`apps/api/src/services/payments/stripe.ts`

- **Standardprodukte**: `POST /api/checkout` mit `paymentMethod: "stripe"` erstellt eine
  **Embedded** Checkout Session (`ui_mode: embedded`). Die Antwort liefert `clientSecret` +
  `publishableKey`; `/checkout` mountet das Stripe-Formular direkt auf der Seite, der Kunde
  verlässt den Shop nicht. Karten schließen in-place ab (`onComplete` → `/checkout/success`),
  nur Redirect-Methoden kehren über `return_url` zurück (`redirect_on_completion: if_required`).
  Im Mock-Modus kommt stattdessen `redirectUrl` direkt zur Success-Seite.
- **Jetzt bezahlen**: Bricht der Kunde ab (Order `awaiting_payment`), zeigt die Bestellseite
  einen Button → `POST /api/orders/:orderNumber/stripe-session?token=…`. Offene embedded Session
  wird wiederverwendet; abgelaufene (bzw. alte hosted Sessions, die vorher expired werden)
  werden durch eine neue ersetzt. Der Tausch von `stripeSessionId` ist gegen parallele Requests
  abgesichert, weil der Webhook nur die gespeicherte Session kennt.
- **Zahlungslink** (Admin-Bestellung „Zahlungslink (Karte/PayPal)“, angenommenes Angebot):
  Bestellung `awaiting_payment` mit Payment `stripe` ohne Session; die Mail verlinkt auf die
  Bestellseite, dort startet „Jetzt bezahlen“ Karte oder PayPal (ADR 0002). Alte Stripe
  Payment Links (`stripe_payment_link`) bleiben gültig und werden beim Stornieren deaktiviert;
  Stornieren einer offenen `stripe`-Zahlung lässt deren Checkout-Session ablaufen.
- **Webhook** `POST /api/webhooks/stripe` verarbeitet `checkout.session.completed`
  (raw body, Signaturprüfung mit `STRIPE_WEBHOOK_SECRET`).

Ohne `STRIPE_SECRET_KEY` läuft der **Mock-Modus**: deterministische `mock_cs_*`-Sessions,
Abschluss über `POST /api/dev/stripe/complete/:sessionId` (nutzt die Success-Seite als
„Zahlung simulieren"-Button; Grundlage der E2E-Tests).

Echtbetrieb: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` setzen
(API-env, in Produktion Pflicht); Webhook-Endpoint
`https://<domain>/api/webhooks/stripe` im Stripe-Dashboard registrieren.

## PayPal (direkt, ADR 0001)

`apps/api/src/services/payments/paypal.ts` (Orders API v2 per `fetch`),
`apps/api/src/services/payments/paypal-flow.ts` (Capture + `markOrderPaid`).

- **Checkout**: `POST /api/checkout` mit `paymentMethod: "paypal"` legt eine PayPal-Order an
  (`intent: CAPTURE`, EUR, `user_action: PAY_NOW`, `NO_SHIPPING`); die Antwort liefert
  `payment.redirectUrl` (Freigabe bei PayPal). Kein PayPal-Script im Shop.
- **Rückkehr**: `GET /api/payments/paypal/return?order&access&token` captured serverseitig und
  leitet per 303 auf `/checkout/success` (bei Fehler: Bestellseite mit `?paypal=failed`,
  Abbruch: `?paypal=cancelled`). Capture nur bei `awaiting_payment`, `method = paypal` und
  passender `paypalOrderId`; abgesichert per `updateMany` (Payment → `processing`),
  `PayPal-Request-Id` und `ORDER_ALREADY_CAPTURED`. Betrag/Währung werden vor `markOrderPaid`
  geprüft, `paypalCaptureId` gespeichert.
- **Bestellseite**: unbezahlte Online-Bestellungen (Stripe oder PayPal) bieten beide Zahlarten.
  `POST /api/orders/:orderNumber/paypal-order?token=…` schließt eine offene Stripe-Session und
  startet eine neue PayPal-Order; `…/stripe-session` stellt zurück auf Stripe und löscht
  `paypalOrderId`. Vorkasse/Bitcoin/Stripe-Zahlungslinks sind nicht umstellbar.
- **Webhook** `POST /api/webhooks/paypal` (Signatur über `verify-webhook-signature` mit
  `PAYPAL_WEBHOOK_ID`): `CHECKOUT.ORDER.APPROVED` (Capture wie oben),
  `PAYMENT.CAPTURE.COMPLETED`/`DENIED`, Erstattungen (`PAYMENT.CAPTURE.REFUNDED`/`REVERSED`,
  `PAYMENT.REFUND.PENDING`/`FAILED`) → `syncProviderRefund`.

Ohne `PAYPAL_CLIENT_ID` **Mock-Modus** (nicht in Produktion): `mock_pp_<cent>_*`-Orders, die
Freigabe-URL führt direkt auf den Rückkehr-Endpunkt. Echtbetrieb: `PAYPAL_ENV`,
`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`; Webhook
`https://<domain>/api/webhooks/paypal` im PayPal-Developer-Dashboard registrieren.

## Banküberweisung

Checkout mit `paymentMethod: "bank_transfer"` → Order-Status **`awaiting_bank_transfer`**,
Kunde sieht Bankdaten (aus Admin → Einstellungen, Fallback `BANK_*`-env) inkl. Verwendungszweck = Bestellnummer.
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

## Erstattungen und Rechnungskorrekturen

`apps/api/src/services/refunds.ts`, Admin-API unter `/api/admin/refunds` (Schreiben nur mit
`payments:refund`). Teil- und Mehrfacherstattungen bis zum gezahlten Betrag; `pending` zählt
gegen den Rest (Zeilensperre auf der Zahlung). Stripe und PayPal erstatten per API, Banküberweisung
und Bitcoin manuell (Admin bestätigt die Rücküberweisung). Ohne Rechnung keine Erstattung.

Erst bei `succeeded` entsteht die Rechnungskorrektur `RK-<Jahr>-<hash>` (eigener Zähler, PDF
nach `INVOICE_DIR`, Kunden-Mail mit Anhang). Vollständig erstattet → Zahlung und Bestellung
`refunded`, offene Druckjobs (`waiting`/`assigned`) → `failed`, Tracking-Event `refund` einmal.

Stripe-Webhook zusätzlich abonnieren: `charge.refunded`, `refund.created`, `refund.updated`,
`refund.failed`. Erstattungen aus dem Stripe-Dashboard werden übernommen; Altzahlungen ohne
gespeicherte PaymentIntent werden dabei ignoriert (API-Erstattungen lösen sie über die Session auf).

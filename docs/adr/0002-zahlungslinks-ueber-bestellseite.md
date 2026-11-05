# Zahlungslinks über die Bestellseite statt über Stripe Payment Links

Zahlungslinks für Admin-Bestellungen und angenommene Angebote zeigen auf unsere Bestellseite (`/order/<nr>?token=…`), wo der Kunde zwischen Karte (Stripe) und PayPal wählt. Neue Stripe Payment Links werden nicht mehr erzeugt. PayPal hat kein Gegenstück zu Stripe Payment Links. Ein einziger Mechanismus für Checkout-Abbruch, Zahlungslink und Angebot ist einfacher als ein eigener Weg pro Zahlungsanbieter.

## Considered Options

- PayPal Invoicing API: eine zweite Rechnung neben unserer eigenen, mit eigenem Status und eigenen Webhooks. Verworfen.

## Consequences

- Bereits verschickte Stripe Payment Links bleiben gültig. Der Webhook- und Stornierungscode für `stripe_payment_link` muss deshalb bestehen bleiben, bis keine offenen Links mehr existieren.

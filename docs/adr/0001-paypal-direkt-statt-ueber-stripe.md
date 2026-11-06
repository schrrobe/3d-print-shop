# PayPal direkt angebunden statt über Stripe

PayPal wird direkt über die PayPal Orders API v2 angebunden (serverseitiges Anlegen und sofortiges Capture, Redirect zu PayPal und zurück auf einen API-Endpunkt), nicht als Zahlart innerhalb von Stripe Checkout. Wir wollen PayPal unabhängig von Stripe anbieten. Der Redirect statt der PayPal-JS-Buttons hält Fremd-Scripte aus dem Shop (DSGVO, CSP). Weil das Capture über unseren Server läuft, buchen wir nur bei noch offenen Bestellungen ab. Ein PayPal-Webhook dient als Absicherung, falls der Kunde den Tab vor der Rückleitung schließt.

## Consequences

- Zweiter Zahlungsanbieter mit eigenem Webhook, eigenen Credentials (`PAYPAL_*`) und eigener Erstattungs-API.
- Die PayPal-Buttons (JS SDK) lassen sich später ohne Backend-Änderung ergänzen.

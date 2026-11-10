# 0001 — Kunden-E-Mail an den Versanddienstleister nur mit Opt-in

**Status:** angenommen (2026-11-09)

## Kontext

DHL-Labels werden direkt aus dem Admin erzeugt. Mit der Kunden-E-Mail kann DHL
eine Paketankündigung schicken. Für die Zustellung selbst ist die E-Mail nicht
erforderlich, Art. 6 Abs. 1 lit. b DSGVO trägt die Weitergabe also nicht.
Aufsichtsbehörden (u. a. BayLDA) verlangen dafür eine Einwilligung.

## Entscheidung

Die E-Mail geht nur an DHL, wenn der Kunde im Checkout eine **standardmäßig
nicht angehakte** Checkbox bestätigt hat (Art. 6 Abs. 1 lit. a DSGVO). Der
Zeitpunkt wird als `Order.carrierEmailConsentAt` gespeichert. Bestellungen ohne
Checkout (Zahlungslink, Angebot) und Altbestellungen haben keine Einwilligung,
an DHL geht dort keine E-Mail.

## Alternativen

- Berechtigtes Interesse (lit. f) mit Hinweis und Widerspruchsrecht: weniger
  Reibung, aber rechtlich angreifbar.
- Keine Weitergabe: keine Paketankündigung durch DHL.

## Folgen

Paylink- und Angebotskunden bekommen keine DHL-Benachrichtigung, nur unsere
Versand-Mail. Eine Einwilligung lässt sich dort später nur über ein eigenes
Opt-in (z. B. im Kundenportal) nachholen.

# Print-Shop

Online-Shop für 3D-Drucke inkl. Admin-Bereich für Bestellungen, Produktion und Zahlungen.

## Zahlungen

**Zahlungsanbieter**:
Das externe Unternehmen, das eine Zahlung abwickelt, z. B. Stripe oder PayPal.
_Avoid_: Payment-Provider, Zahlungsdienstleister, Zahlungsmethode

**Zahlart**:
Was der Kunde beim Bezahlen auswählt, z. B. Karte, Klarna, PayPal, Banküberweisung oder Bitcoin. Eine Zahlart kann zugleich ihr eigener Zahlungsanbieter sein (PayPal), muss es aber nicht (Karte über Stripe, Banküberweisung ohne Anbieter).
_Avoid_: Zahlungsmethode, Zahlungsweg, Payment Method

**Zahlungslink**:
Ein Link, den ein Kunde per E-Mail erhält, um eine bestimmte Bestellung zu bezahlen – unabhängig von Zahlart und Zahlungsanbieter.
_Avoid_: Paylink, Payment Link (außer für das konkrete Stripe-Produkt)

**Erstattung**:
Die (Teil-)Rückzahlung eines bereits gezahlten Betrags an den Kunden, über den Zahlungsanbieter oder manuell (Banküberweisung, Bitcoin). Eine Zahlung kann mehrere Erstattungen haben, zusammen höchstens bis zum gezahlten Betrag.
_Avoid_: Refund, Rückbuchung, Storno

**Rechnungskorrektur**:
Der Beleg über eine erfolgreiche Erstattung, mit eigener Nummer (`RK-…`), negativem Betrag und Bezug auf die Originalrechnung.
_Avoid_: Gutschrift (im UStG die Abrechnung durch den Leistungsempfänger), Stornorechnung, Credit Note

## Bestellungen

**Admin-Bestellung**:
Eine Bestellung, die ein Admin im Backend anlegt (statt der Kunde im Shop), meist mit frei formulierten Positionen und anschließendem Zahlungslink.
_Avoid_: Paylink-Bestellung, manuelle Bestellung

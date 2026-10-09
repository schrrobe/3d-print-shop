# Product <!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Waffenbesitzer in Deutschland – Sportschützen und Jäger –, die ihre
  Munition sortiert, nach Kaliber getrennt und übersichtlich aufbewahren wollen. Sie
  kommen mit genau einer Frage: „Gibt es eine Box für mein Kaliber?"
- **Secondary:** Geschenkkäufer (Partner, Familie, Vereinskollegen), die einem Schützen
  eine personalisierte Box schenken und das Kaliber vom Beschenkten kennen müssen.

## Product Purpose

kaliberbox.de verkauft 3D-gedruckte Patronenboxen mit passgenauen Fächern pro Kaliber.
Kunden wählen Kaliber und Größe (50er oder 100er) und passen Box- und Beschriftungsfarbe
an; gedruckt wird auf Bestellung. Erfolg: ein Schütze findet in Sekunden die Box für sein
Kaliber, konfiguriert sie auf dem Handy und bestellt ohne Rückfragen.

## Positioning

Kaliberspezifische Passform statt Universalbox: jede Box ist für genau ein Kaliber und
eine Patronenzahl konstruiert und in Farben des Kunden gedruckt.

## Operating Context

- Mobil-first: Recherche und Kauf oft am Handy, z. B. am Schießstand oder abends auf dem Sofa.
- Die Boxen werden typischerweise im Waffenschrank bzw. einem verschließbaren
  Munitionsbehältnis gelagert. Sie dienen der Organisation, nicht der gesetzlichen
  Aufbewahrung (§ 36 WaffG).
- Bestellung als Gast; Zahlung per Stripe, Überweisung oder (optional) Bitcoin;
  pauschaler Versand 6,99 €, versandkostenfrei ab 150 €.
- Sechs Sprachen: de (Standard), en, pl, fr, nl, cs.

## Capabilities & Constraints

- Sortiment zum Start: 6 Kaliber (9 mm Luger, .45 ACP, .22 lfB, .223 Rem, .308 Win,
  7,62×39) je als 50er und 100er Box. Jede Größe ist technisch ein eigenes Produkt,
  im Shop über einen 50/100-Umschalter verbunden.
- Kaliber sind Stammdaten mit Gruppe (Kurzwaffe, Langwaffe, Randfeuer); ein Produkt kann
  mehreren Kalibern zugeordnet sein.
- Anpassbar: Boxfarbe und Beschriftungsfarbe aus dem Filamentbestand (Farbzonen).
  Eigener Beschriftungstext ist **nicht** Teil des Angebots (mögliches Folgeprojekt).
- Wunschliste, teilbare Konfigurationen, Bewertungen, „Häufig zusammen gekauft",
  Gutscheine, Support-Tickets.
- Kein Upload eigener Modelle im Shop (Funktion für Kunden entfernt). Kaliberwünsche
  laufen über ein Support-Ticket.
- Keine Kundenkonten.
- Preise im Seed sind Platzhalter, bis echte Preise feststehen.

## Brand Commitments

- Name: **kaliberbox.de**.
- Keine Militär-Ästhetik: kein Camouflage, keine Schablonenschrift, keine Abzeichen,
  keine martialische Sprache. Ton sachlich, präzise, hochwertig, geschenktauglich.
- Schrift frei lizenziert und selbst gehostet (DSGVO; keine externen Font-Hosts).

## Evidence on Hand

- Echte Kundenbewertungen über das Review-System (sofern vorhanden).
- **Keine** echten Produktfotos und keine 3D-Modelle der Boxen; keine verifizierten
  Absatz- oder Druckstunden-Zahlen. Nichts davon darf erfunden werden.

## Product Principles

1. Kaliber zuerst: Jeder Einstieg führt in einem Schritt zur passenden Box.
2. Zeigen statt behaupten: Vorschau in echten Farben, echte Maße, echte Bewertungen.
3. Rechtlich sauber und ehrlich: Aufbewahrungshinweis, klare Preise inkl. Versand,
   AGB/Widerruf vor dem Kauf.
4. Mobil ohne Kompromiss: jeder Schritt mit dem Daumen bedienbar.

## Accessibility & Inclusion

WCAG 2.2 AA verbindlich (BFSG-Niveau), zusätzlich: Touch-Ziele ≥ 44 × 44 px, immer
sichtbare Fokusringe, Skip-Link, Konfigurator vollständig per Tastatur und Screenreader
bedienbar, Vorschau mit Textalternative, `prefers-reduced-motion` respektiert, axe-Tests
für alle Shop-Seiten inkl. Checkout.

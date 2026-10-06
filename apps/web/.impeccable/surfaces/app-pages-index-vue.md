---
version: 1
slug: 'app-pages-index-vue'
primary_target: 'app/pages/index.vue'
related_targets:
  [
    'app/pages/products/index.vue',
    'app/pages/products/[slug].vue',
    'app/pages/cart.vue',
    'app/pages/checkout/index.vue',
    'app/pages/wishlist.vue',
  ]
---

# Shop (kaliberbox.de) — Startseite, Liste, Produkt, Warenkorb, Checkout, Merkliste

Mode: Persuade (Start, Liste, Produkt) · Operate (Warenkorb, Checkout).
Audience: Sportschützen/Jäger (mobil), Geschenkkäufer. Job: Box für ein Kaliber finden,
Farben wählen, als Gast bestellen. Proof: echte Farben in der Vorschau, echte Bewertungen,
WaffG-Hinweis. Keine erfundenen Zahlen, keine Produktfotos vorhanden.

## Direction contract

THESIS: Kaliber finden wie einen Treffer setzen — die Wahl landet im Zentrum eines Ringbilds, alles andere ordnet sich in Ringen; die Kategorie liefert Hero plus Kartenraster, diese Seite liefert eine Scheibe mit einem Treffer.
OWN-WORLD: Scheibenkarton (#f3f1ea) als Grund, schwarzer Spiegel (#121417) als großflächiges Farbfeld (Hero-Scheibe, Kaufleiste, Footer), dünne Ringlinien (1px) mit kleinen Ringzahlen, Maßlinien mit Pfeilspitzen und mm-Angaben, ein einziger Trefferton Signal-Orange (#c2410c) für die primäre Aktion und den Treffermarker, Archivo variabel (schmal für Kaliber-Display, normal für Text), tabellarische Ziffern, eckige Kanten (Radius 2px), keine Schatten außer Overlay.
STORY: Der Schütze sieht seine Kaliberzahl groß, tippt sie an, landet in einem Schritt bei seiner Box, sieht sie in seinen Farben mit 50/100 als verschachtelte Umrisse, legt sie in den Warenkorb und bestellt ohne Formularfrust; der Geschenkkäufer versteht, dass er nur das Kaliber wissen muss.
FIRST VIEWPORT: Mobil: Headline „Für welches Kaliber?" oben, darunter quadratischer schwarzer Spiegel mit Ringlinien, im Zentrum das aktive Kaliber (z. B. „9 mm Luger") in schmaler Display-Grotesk, um die Scheibe die 6 Kaliber als Ringzahl-Chips (44px), primärer Button „Boxen für 9 mm Luger" direkt unter der Scheibe. Desktop: Headline + Kurztext + Chips links, Scheibe rechts ~560px.
SIGNATURE INTERACTION: Kaliberwahl setzt einen Treffer — Treffermarker gleitet ins Zentrum, Kaliberbezeichnung wechselt mit kurzem Masken-Reveal, Ringe pulsieren einmal (reduced-motion: sofortiger Wechsel). Auf der Produktseite: 50/100-Umschalter zieht die Box-Zeichnung in die zweite Form (gewählte Größe durchgezogen, andere gestrichelt).
FORM: Die Ringscheibe (assigned, Runde 2 Position 3), seed key 4fc62e76.
RAISES: Schnittmuster → 50/100 als verschachtelte Linien; Oszilloskop → alles am Maßraster mit mm-Angaben; Plattencover → ein flaches Farbfeld (Spiegelschwarz) trägt die Seite; Tageslicht → die Auswahl wandert als ein Element durch Liste/Produkt/Warenkorb; Minihompy → Farbnamen + Kaliber stehen wie Signatur an der Box.
FINISH: unreviewed undocumented unfinished; build ends finish review, verdict, DESIGN.md, every shipping raster carrying its provenance

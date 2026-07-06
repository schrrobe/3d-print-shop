# Produktfotos

Produkte zeigen im Shop echte **Produktfotos** (1–4 pro Produkt). Fotos liegen als
`ProductAsset` mit `type = image` (kein Schema-Zusatz nötig) und werden nach `sortOrder`
sortiert ausgeliefert. Das erste Foto ist das Coverbild (Listing, SEO, Warenkorb).

## Speicherung & Auslieferung

- Upload landet in `UPLOAD_DIR/products/` (Dateiname `<timestamp>_<token>_<name>`).
- Öffentlich ausgeliefert über `GET /api/product-images/:filename` (Produktfotos sind
  öffentlich — analog zu GLB-Modellen unter `/api/models/:filename`; **nicht** statisch
  gemountet, sondern per Endpoint mit Endungs- und Path-Traversal-Guard).
- Validierung: nur `.jpg/.jpeg/.png/.webp`, MIME-Typ **und** Magic-Byte-Prüfung
  (`validateUploadedImages`), max. 10 MB pro Datei, max. 4 Dateien pro Request.
- Asset-URL in der DB: `/api/product-images/<filename>`.

## Admin

`/admin/products/:id` → Karte **„Produktfotos"** (Berechtigung `assets:write`):

- `POST /api/admin/products/:id/images` (multipart `files`, 1–4) — hängt Fotos an; der
  Server lehnt ab, sobald insgesamt mehr als 4 Fotos entstünden (`400`). Client kappt die
  Auswahl zusätzlich auf die noch freien Plätze.
- `DELETE /api/admin/products/:id/assets/:assetId` — entfernt ein Foto und löscht die Datei.

## Storefront

- **Detailseite** (`/products/:slug`): oben die Foto-**Galerie** (Hauptbild + Thumbnails ab
  2 Fotos) neben Name/Preis/Beschreibung und dem Kauf-Block. Ohne Fotos erscheint oben ein
  **Platzhalter**, nie das 3D-Modell.
- **Konfigurator** (3D-Modell + Farbauswahl + beliebte Kombinationen) sitzt in einer eigenen
  Sektion **darunter** (`data-testid="configurator"`).
- **Listing** (`/products`): `PsProductCard` zeigt stets das Coverbild bzw. einen Platzhalter,
  nie den Konfigurator.

## Komponente

`PsProductGallery` (`@print-shop/ui`): `images: { url; alt? }[]`, `placeholderLabel?`. Rein
präsentational, tastaturbedienbar (Thumbnails sind Buttons mit `aria-current`). Storybook:
`Shop/ProductGallery`.

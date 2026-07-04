# Review-System

Produktbewertungen sind nur nach einer echten Bestellung möglich, werden moderiert und
erst nach Freigabe öffentlich gezeigt.

## Berechtigung

- Bestellstatus ∈ {`shipped`, `completed`} (`REVIEWABLE_ORDER_STATUSES`).
- Genau **eine** Bewertung pro Bestellposition (`Review.orderItemId @unique`).
- Nur Katalogprodukte (Positionen ohne `productId` sind nicht bewertbar).
- Auth: Order-`accessToken` **oder** Portal-Magic-Token (Bearer, E-Mail muss zur
  Bestellung passen).

## Datenmodell

**Review** — `orderItemId @unique`, `orderId`, `productId`, `rating` (1–5), `title?`,
`body`, `photoPath?`, `displayName` (**einziges** öffentliches Kundenfeld), `locale`,
`status`, `internalNote?`, `flaggedAbuse`, `moderatedById?`, `moderatedAt?`.

## Statusmaschine (`packages/utils/src/review-status.ts`)

```
pending ─> approved | rejected
approved ─> hidden
hidden ─> approved
rejected ─> approved
```

Neue Reviews starten `pending`. Öffentlich sichtbar sind ausschließlich `approved`
Reviews.

## Review-Request-Mail

Automatisch beim Bestellübergang → `completed` **und** per manuellem Admin-Button
(`POST /api/admin/orders/:id/review-request`). Doppelversand verhindert ein EmailLog-Dedupe
(`review_request` + Betreff).

## Endpunkte

**Öffentlich** (`sensitiveLimiter`): `GET /api/reviews/eligibility`,
`POST /api/reviews` (multipart, ein Foto ≤ 5 MB), `GET /api/products/:slug/reviews`
(freigegebene Reviews + Durchschnitt + Anzahl), `GET /api/reviews/photos/:filename`
(nur wenn Review `approved`, Traversal-Guard).

**Admin** (`reviews:read` / `reviews:moderate`): `GET /`, `GET /:id`, `PATCH /:id`
(Status/Notiz/Abuse-Flag, auditiert), `GET /:id/photo` (für jeden Status).

## Datenschutz

- Öffentliches DTO enthält nur `displayName` — keine E-Mail, kein Bestellbezug.
- Review-Fotos sind nur bei `approved` öffentlich; die Auslieferung nutzt ausschließlich
  den Dateinamen aus der DB als Lookup-Key.
- `AggregateRating` fließt ins Produkt-JSON-LD ein, sobald mindestens eine freigegebene
  Bewertung existiert.

## RBAC

`reviews:read` / `reviews:moderate` — product_manager & support.

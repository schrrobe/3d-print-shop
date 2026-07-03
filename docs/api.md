# API-Referenz

Express 5, Basis-URL `http://localhost:3001`. Alle Bodies JSON (außer Uploads/Webhooks).
Validierung mit Zod (`packages/validators`) → 400 mit Fehlerdetails.
Fehlerformat: `{ "error": "<code>", "message": "…", "details"?: … }`.

## Public

| Methode & Pfad | Beschreibung |
|---|---|
| `GET /health` | Healthcheck |
| `GET /api/products` | Aktive Produkte inkl. Übersetzungen, Assets, Farbzonen |
| `GET /api/products/:slug` | Produktdetail |
| `GET /api/colors` | Aktive globale Farben |
| `GET /api/models/:filename` | Admin-hochgeladene GLB-Vorschaumodelle (`model/gltf-binary`) |
| `GET /api/social-media/:filename` | Admin-hochgeladene Social-Post-Bilder (öffentlich — Meta lädt Medien per URL) |
| `POST /api/checkout` | Gast-Checkout `{items, address, paymentMethod: stripe\|bank_transfer\|bitcoin, locale, note?}` → `{orderNumber, accessToken, totals, payment}` (Rate-Limit) |
| `GET /api/orders/:orderNumber?token=` | Bestellstatus für Gäste (Token aus Bestätigung) |
| `POST /api/upload-requests` | multipart: `files[]` (.stl/.3mf ≤ 50 MB, max 5) + name, email, description, quantity, locale (Rate-Limit) |
| `GET /api/quotes/:token` | Öffentliche Angebotsansicht |
| `POST /api/quotes/:token/accept` | `{address}` → Order + `{paymentUrl}` (Stripe Payment Link) |
| `POST /api/quotes/:token/decline` | Angebot ablehnen |
| `POST /api/consent` | DSGVO-Consent-Log `{categories, version, locale, anonymousId?}` |
| `GET /api/payments/:paymentId` | Zahlungsstatus (Polling) |
| `POST /api/payments/bitcoin/:paymentId/sync` | Blockchain-Provider abfragen; ab 2 Bestätigungen → bezahlt |
| `POST /api/webhooks/stripe` | Stripe-Webhook (raw body, Signaturprüfung wenn Secret gesetzt) |
| `POST /api/tickets` | Support-Ticket erstellen `{name, email, subject, message, category, orderNumber?, locale}` → `{ticketNumber, accessToken, orderLinked}` (Rate-Limit; Order nur bei E-Mail-Match verknüpft) |
| `GET /api/tickets/:token` | Öffentlicher Ticket-Thread (Token aus Bestätigungs-E-Mail) |
| `POST /api/tickets/:token/messages` | Kundenantwort `{body}`; reopent wartende/gelöste Tickets, 409 bei geschlossenen (Rate-Limit) |
| `GET /api/orders/:orderNumber/invoice.pdf?token=` | Rechnung als PDF (regenerate-if-missing) |
| `POST /api/complaints` | Reklamation eröffnen (multipart, Order-Token, bis 5 Fotos) → `{complaintNumber, accessToken}` |
| `GET /api/complaints/:complaintNumber?token=` · `POST …/reply?token=` · `GET …/attachments/:id?token=` | Kundensicht / Antwort (nur `info_needed`) / Foto |
| `POST /api/portal/request-link` | Magic-Link anfordern (immer 202, Anti-Enumeration) |
| `GET /api/portal/{me,orders,orders/:orderNumber,orders/:orderNumber/invoice.pdf,quotes,configurations}` | Kundenbereich, `Authorization: Bearer <token>` |
| `POST /api/configurations` · `GET /api/configurations/:shareToken` | Farbkonfiguration speichern/teilen (dedupliziert) / laden inkl. Verfügbarkeit |
| `GET /api/products/:slug/popular-configurations` | Beliebte Kombinationen (aggregiert, Schwelle ≥ 2) |
| `GET /api/reviews/eligibility` · `POST /api/reviews` · `GET /api/products/:slug/reviews` · `GET /api/reviews/photos/:filename` | Review-Berechtigung / Abgabe (multipart) / öffentliche Reviews / Foto (nur approved) |

## Dev-only (`NODE_ENV !== production`)

`POST /api/dev/stripe/complete/:sessionId` · `POST /api/dev/bitcoin/:paymentId/advance
{confirmations?, receivedSats?}` · `GET /api/dev/emails?to=&template=`

## Admin (`/api/admin/*`, Session-Cookie `ps_session`, RBAC pro Route)

Auth: `POST auth/login` (Rate-Limit 10/15 min) · `POST auth/logout` · `GET auth/me` ·
`POST auth/password-reset-request` · `POST auth/password-reset`.

| Ressource | Endpunkte | Permission |
|---|---|---|
| Dashboard | `GET dashboard` | dashboard:read |
| Produkte | `GET/POST products`, `GET/PATCH/DELETE products/:id`, `POST products/:id/assets`, `POST products/:id/model` (multipart `file`, .glb ≤ 50 MB — ersetzt das GLB-Vorschaumodell) | products:read/write, assets:write |
| Farben | `GET/POST colors`, `PATCH/DELETE colors/:id` | colors:read/write |
| Upload-Anfragen | `GET quote-requests[/:id]`, `POST quote-requests/:id/status` | uploads:read/review |
| Angebote | `POST quote-requests/:id/quotes` (sendet E-Mail mit Link) | quotes:write |
| Bestellungen | `GET orders[/:id]`, `POST orders/:id/status`, `POST orders/:id/mark-paid` (Bank), `POST orders/:id/shipping` `{carrier: dhl\|hermes, trackingNumber}` | orders:read/write/ship, payments:write |
| Zahlungen | `GET payments` | payments:read |
| Rechnungen | `GET invoices`, `GET invoices/:id/pdf` | invoices:read |
| Drucker | `GET/POST printers`, `POST printers/:id/status`, `POST printers/:id/spools`, `PATCH printers/spools/:id` | printers:read/write |
| Produktion | `GET production/queue` (inkl. ETA je Drucker), `POST production/:jobId/assign`, `POST production/:jobId/status` | print-jobs:read/write |
| Benutzer | `GET/POST users`, `PATCH users/:id` | users:read/write |
| Support-Tickets | `GET tickets` (Filter status/priority/assignedToId), `GET tickets/assignees`, `GET tickets/:id`, `POST tickets/:id/messages` (E-Mail an Kunde), `POST tickets/:id/status`, `PATCH tickets/:id` (Priorität/Kategorie/Zuweisung) | tickets:read/write |
| Social Media Planner | `GET social-posts` (Filter platform/status, Suche `q`), `GET social-posts/:id`, `GET social-posts/prefill/:productId` (Produktdaten für den Editor), `POST social-posts` (`{platforms[], caption, mediaUrls[], productId?, scheduledAt?, schedule}` — eine Post-Zeile je Plattform), `PATCH social-posts/:id` (nur draft/scheduled/failed, sonst 409), `POST social-posts/:id/schedule` `{scheduledAt}` (UTC), `POST social-posts/:id/retry` (failed → sofort fällig), `POST social-posts/:id/cancel`, `DELETE social-posts/:id` (nicht bei published, 409), `POST social-posts/run-scheduler` (manueller Worker-Lauf), `POST social-posts/media` (multipart `file`, JPG/PNG/WebP) | social-posts:read/write |
| Reklamationen | `GET complaints` (Filter status), `GET complaints/:id`, `POST complaints/:id/status`, `PATCH complaints/:id` (interne Notiz), `POST complaints/:id/decision` (**complaints:decide**), `POST complaints/:id/ticket`, `POST complaints/:id/photos`, `GET complaints/:id/attachments/:id` | complaints:read/write/decide |
| Qualitätskontrolle | `GET qc` (Records + `jobsInQc`), `POST qc` (Record eröffnen), `PATCH qc/:id` (Checkliste), `POST qc/:id/status`, `POST qc/:id/override` (**qc:override**), `POST qc/:id/photos`, `GET qc/:id/attachments/:id` | qc:read/write/override |
| Filament & AMS | `GET/POST filament/spools`, `PATCH/DELETE filament/spools/:id`, `GET filament/alerts`, `GET filament/shopping-list`, `POST filament/colors/:colorId/availability` (colors:write), `GET/POST/DELETE filament/ams-units`, `PATCH filament/ams-slots/:id` | filament:read/write |
| Produktionskalender | `GET production/calendar?from&to`, `POST production/:jobId/schedule` (Overlap → 409, `force`), `DELETE production/:jobId/schedule`, `POST production/printers/:printerId/maintenance`, `DELETE production/maintenance/:id` | print-jobs:read/write, printers:write |
| Versand | `GET shipments`, `POST shipments`, `GET shipments/:id` (+QC-Stand), `POST shipments/:id/status` (QC-Gate), `POST shipments/:id/ship` (**orders:ship**), `GET shipments/:id/packing-list.pdf`, `GET shipments/:id/delivery-note.pdf` | shipments:read/write |
| Bewertungen | `GET reviews` (Filter status/flagged), `GET reviews/:id`, `PATCH reviews/:id` (Moderation), `GET reviews/:id/photo` | reviews:read/moderate |
| Bestellungen (Versand/Review) | `POST orders/:id/shipping` (Legacy-Wrapper über `shipShipment()`), `POST orders/:id/review-request` | orders:ship, orders:write |
| Audit | `GET audit-log` | audit:read |

Alle Admin-Mutationen schreiben ins `AdminAuditLog`.

## Security

helmet (Security-Header) · CORS nur für `WEB_URL` mit Credentials · httpOnly/SameSite-Lax-Cookies
(secure via `COOKIE_SECURE`) · Rate-Limits auf Login/Checkout/Upload · Upload-Whitelist
(.stl/.3mf) + 50-MB-Limit + Dateinamen-Sanitizing · RBAC-Matrix aus `packages/utils`.

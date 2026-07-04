# Kundenbereich (Magic-Link)

Kunden erreichen eine Aggregatsicht **aller** Bestellungen, Angebote und gespeicherten
Konfigurationen einer E-Mail-Adresse — ohne Kundenkonto, über einen sicheren Magic-Link.

## Warum Magic-Link statt Konto

Es gibt keine Kundenkonten (`User` = Staff mit RBAC). Der Portal-Mehrwert ist die
Sammelansicht pro E-Mail; die bestehende `/order/[number]?token=`-Seite bleibt unberührt.

## Token-Sicherheit

- `randomToken(32)`, in der DB **nur als SHA-256-Hash** (`MagicLinkToken.tokenHash`,
  Präzedenz: `PasswordResetToken`). Klartext existiert ausschließlich im E-Mail-Link.
- Gültigkeit **30 Tage** (`PORTAL_TOKEN_TTL_DAYS`), max. **3 aktive Tokens/E-Mail**
  (`PORTAL_TOKEN_MAX_ACTIVE`, ältere werden revoked).
- Transport ausschließlich über `Authorization: Bearer` — **nie** als Query-String.
- Anti-Enumeration: `POST /request-link` antwortet **immer** `202`, unabhängig davon, ob
  Bestellungen existieren; Rate-Limit `authLimiter`.
- Die Portal-Seite trägt `noindex` + `referrer: no-referrer`.
- `PortalAccessLog` protokolliert Zugriffe (fire-and-forget, wie `audit()`).

## Endpunkte

- `POST /api/portal/request-link` (`authLimiter`, immer `202`).
- Danach alle mit Bearer-Token (`requirePortalToken`, `401 invalid_portal_token` vs.
  `expired_portal_token`):
  `GET /me`, `GET /orders`, `GET /orders/:orderNumber`,
  `GET /orders/:orderNumber/invoice.pdf`, `GET /quotes`, `GET /configurations`.

`GET /orders` liefert je Bestellung u. a. `orderUrl` + Order-`accessToken`, sodass das
Portal für Zahlung-erneut-öffnen, Reklamation und Review auf die bestehenden
Token-Seiten verlinkt (gleiches Privileg, deutlich kleinere API-Fläche).

## Seiten (`apps/web`)

- `pages/portal/index.vue` — Link anfordern (bestätigt anti-enumerativ).
- `pages/portal/[token].vue` — Bestellungen (Status, Produktionsfortschritt, Tracking,
  Rechnung), Angebote, gespeicherte Konfigurationen. Abgelaufener Token → Renewal-Form.
  i18n in allen sechs Locales.

## RBAC / Datenschutz

Keine Staff-Rolle nötig — der Token autorisiert nur die eigenen Daten der E-Mail. Rechnung
per Bearer-`fetch` (ein `<a href>` kann keinen Header setzen).

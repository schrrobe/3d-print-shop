# DSGVO & Consent

## Grundsatz

**Kein Tracking vor Opt-in.** Es werden keinerlei Statistik-/Marketing-Skripte geladen,
bevor der Nutzer aktiv eingewilligt hat. Notwendige Funktionen (Warenkorb, Checkout,
Sprache, Theme) laufen ohne Einwilligungspflicht (berechtigtes Interesse / Vertragserfüllung).

## Kategorien

| Kategorie | Inhalt                                                         | Rechtsgrundlage          |
| --------- | -------------------------------------------------------------- | ------------------------ |
| notwendig | Warenkorb (localStorage), Session-Cookie Admin, Sprache, Theme | keine Einwilligung nötig |
| statistik | Google Analytics 4, eigene Reichweitenmessung (gespeichert)    | Opt-in                   |
| marketing | Meta Pixel, TikTok Pixel, GTM, serverseitige Conversion-APIs   | Opt-in                   |

## Implementierung

- **Banner** (`ConsentBanner.vue`): „Alle akzeptieren“ / „Nur notwendige“ / „Einstellungen“
  (granular je Kategorie). Bewusst animationsfrei, blockiert den Zahlungsprozess nicht.
- **Speicherung**: localStorage `print-shop-consent` `{necessary, statistics, marketing,
version, updatedAt}`. Bei Versionssprung (`CONSENT_VERSION` in `packages/utils`) wird die
  Einwilligung ungültig → Banner erscheint erneut.
- **Consent-Log**: Jede Entscheidung wird mit anonymer Zufalls-ID, Version, Locale und
  User-Agent an `POST /api/consent` gemeldet (`ConsentLog`-Tabelle) — Nachweisbarkeit.
- **Tracker-Gate** (`plugins/analytics.client.ts`): GA4 lädt nur bei `statistics=true`,
  Meta/TikTok Pixel nur bei `marketing=true`, GTM nur bei beidem — jeweils nur mit
  konfigurierter ID (Admin-Einstellungen; TikTok: `TIKTOK_PIXEL_CODE`). Google Consent Mode v2
  startet auf „denied“. Widerruf einer Kategorie, deren Tracker schon lief: Tracker-Cookies
  (`_ga`, `_gcl`, `_fbp`, `_fbc`, `_ttp`, …) werden gelöscht und die Seite neu geladen.
- **Eigene Messung** (`plugins/tracking.client.ts` → `POST /api/t/events`): der Browser sendet
  mit Statistik- **oder** Marketing-Einwilligung. Gespeichert (`TrackingEvent`/`Session`,
  Besucher-ID `ps_vid`, Checkout-Header `x-tracking-session`) wird nur mit Statistik;
  reine Marketing-Batches werden nur an die Conversion-APIs weitergeleitet.
- **Versionierung**: `CONSENT_VERSION` bei jeder Zweckänderung erhöhen (2.0: TikTok +
  serverseitige Conversion-APIs) — alte Einwilligungen verfallen, Banner erscheint erneut.
- Einstellungen jederzeit über den Footer-Link „Einstellungen“ änderbar.
- Logik (`canLoadGa4`, `canLoadMetaPixel`, Parsing) unit-getestet
  (`packages/utils/test/consent.test.ts`), E2E in `consent-tracking.spec.ts`.

## Serverseitige Conversion-APIs (wie storylo)

Nur mit `marketing=true`. Pixel und Server senden dieselbe Event-ID, Meta/TikTok
deduplizieren das Paar.

- **Ereignisse**: page_view (nur Meta), view_item, add_to_cart, begin_checkout (aus der
  eigenen Messung, direkt und ohne Speicherung: `sendClientConversions`) und purchase (nach
  Zahlung über die Outbox mit Retry: `enqueuePurchaseOutbox`).
- **Übermittelte Daten**: IP-Adresse, User-Agent, Cookies `_fbp`/`_fbc`/`_ttp`, Klick-IDs
  (`fbclid`/`ttclid` aus der Session), Wert/Produkt, beim Kauf die E-Mail als SHA-256.
  Kein Klick-ID-Zwang mehr — bewusste Abkehr von der früheren Datenminimierung
  (Entscheidung 2026-10-25, Parität zu storylo); Datenschutzerklärung Abschnitt 8.
- **Speicherung**: IP/Cookies landen nie in `TrackingEvent`/`TrackingSession`. Für den Kauf
  hält `Order.trackingAttribution` sie bis zur Zahlung (dann gelöscht, auch ohne Consent),
  unbezahlte Bestellungen leert die Retention nach 30 Tagen. Admin-Bestell-APIs blenden
  das Feld per `omit` aus (`routes/admin/orders.ts`).
  Outbox-Payloads (IP, Cookies, E-Mail-Hash): 30 Tage (gesendet) bzw. 90 Tage (fehlgeschlagen).
- **Bekannte Grenze**: Maßgeblich ist die Einwilligung beim Checkout. Ein Widerruf zwischen
  Bestellung und Zahlungseingang (Überweisung/Bitcoin) stoppt die Kauf-Meldung nicht — der
  Widerruf ist anonym und nicht mit der Bestellung verknüpft (wie storylo). Ggf. rechtlich prüfen.
- **Dashboards**: In Meta Events Manager und TikTok Events Manager muss das automatische
  erweiterte Matching (Formular-Scraping) **aus** sein; Meta-`autoConfig` ist im Code aus.

## Abgrenzung: Social Media Planner

Der [Social Media Planner](social-media-planner.md) veröffentlicht **ausgehende**
Marketing-Posts der Shop-Betreiber auf eigenen Kanälen (Facebook-Seite,
Instagram-Business) über die offiziellen Meta-APIs. Dabei fließen **keine Kunden- oder
Besucherdaten** an Meta — übertragen werden nur Post-Inhalte (Caption, Produktbilder,
Produktlinks). Er ist damit unabhängig vom Meta **Pixel** (Kategorie „marketing“,
Opt-in-pflichtig). Access Tokens liegen ausschließlich serverseitig.

## Verkaufskanäle (Influencer-Links)

Admin legt unter `/admin/sales-channels` Links `/r/<code>` an.
Ein Klick setzt das First-Party-Cookie `ps_ref` (httpOnly, SameSite=Lax, 30 Tage) mit
**nur** Link-Code und Klickzeit und leitet aufs Ziel weiter. Gezählt wird nur „ein
Klick“ — ohne IP, User-Agent oder Besucher-ID; Bots/Link-Vorschauen zählen nicht.

Das Cookie wird **ohne Einwilligung** gesetzt: Es dient ausschließlich der
Provisionsabrechnung mit dem Partner, bildet kein Profil, wird an keinen Dritten
übertragen und enthält keine Geräte- oder Personendaten. Bewusste Ausnahme von „kein
Tracking vor Opt-in“ (gleiche Abwägung wie bei storylo) — keine Rechtsberatung; bei
Zweifeln das Setzen an die Kategorie `marketing` koppeln.

Ist dem Kanal ein einlösbarer Gutschein zugeordnet, hängt der Link `?gutschein=<CODE>` an;
das Plugin `referral-voucher.client.ts` holt ihn über `GET /api/vouchers/referral` (nur mit
gültigem `ps_ref`) und legt ihn in den Warenkorb.

Zuordnung: Gutschein des Kanals schlägt Cookie, sonst letzter Klick innerhalb von 30
Tagen. Provisionsbasis (Warenwert nach Rabatt, ohne Versand) und Provision werden beim
Checkout an der Bestellung festgeschrieben.

## Weitere DSGVO-Punkte

- Gastbestellung: nur vertragsnotwendige Daten, kein Konto.
- E-Mails transaktional (kein Marketing).
- Die finalen Rechtstexte (Impressum/Datenschutz/AGB) müssen vor Livegang von
  der verantwortlichen Person bzw. Rechtsberatung freigegeben und mit den
  tatsächlichen Unternehmensdaten veröffentlicht werden.
- Fristen, Löschsperren, Backups und der operative Ablauf stehen im
  [Lösch- und Aufbewahrungskonzept](deletion-retention.md).

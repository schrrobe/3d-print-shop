# DSGVO & Consent

## Grundsatz

**Kein Tracking vor Opt-in.** Es werden keinerlei Statistik-/Marketing-Skripte geladen,
bevor der Nutzer aktiv eingewilligt hat. Notwendige Funktionen (Warenkorb, Checkout,
Sprache, Theme) laufen ohne Einwilligungspflicht (berechtigtes Interesse / Vertragserfüllung).

## Kategorien

| Kategorie | Inhalt                                                         | Rechtsgrundlage          |
| --------- | -------------------------------------------------------------- | ------------------------ |
| notwendig | Warenkorb (localStorage), Session-Cookie Admin, Sprache, Theme | keine Einwilligung nötig |
| statistik | Google Analytics 4                                             | Opt-in                   |
| marketing | Meta Pixel                                                     | Opt-in                   |

## Implementierung

- **Banner** (`ConsentBanner.vue`): „Alle akzeptieren“ / „Nur notwendige“ / „Einstellungen“
  (granular je Kategorie). Bewusst animationsfrei, blockiert den Zahlungsprozess nicht.
- **Speicherung**: localStorage `print-shop-consent` `{necessary, statistics, marketing,
version, updatedAt}`. Bei Versionssprung (`CONSENT_VERSION` in `packages/utils`) wird die
  Einwilligung ungültig → Banner erscheint erneut.
- **Consent-Log**: Jede Entscheidung wird mit anonymer Zufalls-ID, Version, Locale und
  User-Agent an `POST /api/consent` gemeldet (`ConsentLog`-Tabelle) — Nachweisbarkeit.
- **Tracker-Gate** (`TrackingScripts.vue`): GA4 lädt nur bei `statistics=true` **und**
  gesetzter `NUXT_PUBLIC_GA4_MEASUREMENT_ID`; Meta Pixel nur bei `marketing=true` **und**
  `NUXT_PUBLIC_META_PIXEL_ID`. Ohne IDs (Default) lädt nie etwas — Platzhalter-Integration.
- Einstellungen jederzeit über den Footer-Link „Einstellungen“ änderbar.
- Logik (`canLoadGa4`, `canLoadMetaPixel`, Parsing) unit-getestet
  (`packages/utils/test/consent.test.ts`), E2E in `consent-tracking.spec.ts`.

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

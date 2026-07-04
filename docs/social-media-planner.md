# Social Media Planner

Admins bereiten Produkt-Posts direkt im Shop vor und veröffentlichen sie zeitgesteuert
auf **Facebook** (Page Feed) und **Instagram** (Feed, Business/Creator-Account) — über die
offiziellen Meta Graph APIs. Keine inoffiziellen Bots, kein Scraping, keine Auto-Follows,
keine Cold-DMs, kein Posting auf private Profile.

## Admin-Workflow

1. `/admin/social` — Planner mit **Listen-** und **Kalenderansicht**, Filter nach Plattform
   und Status, Suche nach Caption/Produktname/ID.
2. „Neuen Post erstellen" → Editor (`/admin/social/new`):
   - Plattformwahl (Instagram, Facebook oder beide)
   - Produktauswahl → **Vorbefüllung** mit Name, Beschreibung, Preis, Produktlink + erstem Bild
   - Caption (max. 2200 Zeichen — Instagram-Limit), Medienauswahl aus Produktbildern,
     optionaler Upload neuer Bilder (JPG/PNG/WebP)
   - Datum/Uhrzeit **zeitzonenbewusst**: Eingabe in lokaler Admin-Zeitzone
     (`datetime-local`), Speicherung als UTC (`scheduledAt`)
   - Live-Vorschau (Plattform-Badge, Bild, Caption, Produktlink, Zeit, Status)
   - „Als Entwurf speichern" / „Planen" / „Abbrechen"
3. Bearbeiten/Löschen nur solange nicht veröffentlicht; fehlgeschlagene Posts können
   erneut geplant werden („Erneut planen" = sofort fällig).
4. „Fällige Posts jetzt veröffentlichen" stößt den Scheduler manuell an (dev-freundlich).

## Statusmodell

`draft → scheduled → publishing → published`, Fehlerpfad `publishing → failed → scheduled`
(Retry), außerdem `scheduled → draft` (Planung aufheben) und `draft|scheduled|failed →
cancelled`. `published` und `cancelled` sind terminal. Transitions zentral in
`packages/utils/src/social-post-status.ts`, serverseitig erzwungen (409 bei Verstoß).

## Datenmodell & Entscheidung „beide Plattformen"

`SocialMediaPost` (Prisma): `platform`, `status`, `caption`, `mediaUrls[]`, `productId?`,
`scheduledAt?`, `publishedAt?`, `errorMessage?`, `externalPostId?`, `provider`, `attempts`,
`lastAttemptAt?`, `lockUntil?`, `publishRequestId?` (unique), `metadata?`, `createdBy`,
Timestamps.

**Entscheidung:** Ein Editor-Submit mit „beide Plattformen" erzeugt **eine Post-Zeile pro
Plattform** (statt einer Zeile mit Plattform-Array). Gründe:

- Idempotenz & Locking pro Zielplattform: Instagram kann fehlschlagen, während Facebook
  durchgeht — jede Zeile hat eigenen Status, eigene `externalPostId`, eigene Fehler/Retries.
- Kein Teil-Erfolgs-Zustand („halb veröffentlicht") im Datenmodell.
- Spätere Plattformen (Pinterest, TikTok, …) ändern nur das Enum, nicht die Semantik.

## Publishing-Architektur

```
services/social/
├── publisher.ts   SocialMediaPublisher-Interface, SocialPublishError, SocialPostType ('feed', später 'reel'|'story'|'carousel')
├── mock.ts        MockSocialMediaPublisher — Standard ohne Credentials; "[e2e-fail]" in der Caption erzwingt Fehlschlag
├── meta.ts        FacebookPagePublisher, InstagramPublisher, MetaPublishingService, mapMetaError()
├── scheduler.ts   processDueSocialPosts(), runSocialPublishingTick(), startSocialPublishingCron()
└── index.ts       createSocialMediaPublisher() — Auswahl via SOCIAL_PUBLISHING_PROVIDER
```

- **Facebook Page Feed:** `POST /{page-id}/photos` (Bild + Caption) bzw. `/{page-id}/feed`
  (nur Text). **Instagram Feed:** Container-Flow `POST /{ig-user-id}/media` →
  `/{ig-user-id}/media_publish`; mindestens ein Bild ist Pflicht (serverseitig validiert).
- Access Tokens ausschließlich serverseitig (env), nie im Frontend, nie im Repo.
- `mapMetaError()` übersetzt Graph-API-Fehler in stabile Codes
  (`meta_invalid_token`, `meta_permission_denied`, `meta_rate_limited`, `meta_media_error`, …)
  inkl. Retry-Hinweis; der Code landet in `errorMessage`.
- Relative Medien-URLs werden vor dem API-Call absolut aufgelöst (`WEB_URL`/`API_URL`) —
  Meta lädt Bilder per URL, sie müssen öffentlich erreichbar sein. Hinweis: SVG-Platzhalter
  aus dem Seed akzeptiert Instagram real nicht (JPG/PNG/WebP verwenden).

## Scheduler & Idempotenz

Worker-Tick (`SOCIAL_PUBLISHING_CRON_ENABLED=true`, Intervall
`SOCIAL_PUBLISHING_CRON_INTERVAL_SECONDS`) bzw. manuell via
`POST /api/admin/social-posts/run-scheduler`:

1. **Recovery:** Posts, die in `publishing` mit abgelaufenem `lockUntil` hängen
   (Worker-Crash), werden `failed` markiert — **nie** automatisch erneut veröffentlicht,
   da der externe Call durchgegangen sein könnte. Admin entscheidet über den Retry.
2. **Fällige Posts:** `status=scheduled AND scheduledAt <= now` (Batch 20).
3. **Claim per Compare-and-Swap:** `updateMany({ where: { id, status: 'scheduled' } })` →
   bei parallelen Workern gewinnt genau einer (count=1), alle anderen überspringen.
   Der Claim setzt `publishing`, frisches `publishRequestId`, `lockUntil` (+5 min),
   `attempts+1`, `lastAttemptAt`.
4. **Publish** über den Provider; Erfolg → `published` + `publishedAt` + `externalPostId`
   (Guard: `{ id, status: 'publishing', publishRequestId }`), Fehler → `failed` +
   `errorMessage`.

Doppel-Publish ist damit bei parallelen Workern, Worker-Restarts und wiederholten
Ticks ausgeschlossen (unit-getestet in `apps/api/test/social-scheduler.test.ts`).

## API (Auszug)

`/api/admin/social-posts` — RBAC `social-posts:read` (auch Support) bzw.
`social-posts:write` (admin, product_manager). Details: [api.md](api.md).
Alle Admin-Aktionen werden ins `AdminAuditLog` geschrieben (`social_post.*`).

## Environment Variables

| Variable | Bedeutung |
|---|---|
| `SOCIAL_PUBLISHING_PROVIDER` | `mock` (Default, keine externen Calls) oder `meta` |
| `SOCIAL_PUBLISHING_CRON_ENABLED` | `true` aktiviert den Interval-Worker |
| `SOCIAL_PUBLISHING_CRON_INTERVAL_SECONDS` | Tick-Intervall (Default 60) |
| `META_APP_ID` / `META_APP_SECRET` | Meta-App (App-Review für `pages_manage_posts`, `instagram_content_publish`) |
| `META_GRAPH_API_VERSION` | z. B. `v23.0` |
| `META_FACEBOOK_PAGE_ID` / `META_FACEBOOK_PAGE_ACCESS_TOKEN` | Page-ID + Page Access Token |
| `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` / `META_INSTAGRAM_ACCESS_TOKEN` | IG-Business-Account + Token |

## Voraussetzungen für echtes Publishing

1. Facebook-Seite + Meta-App (Business-Typ); Instagram-Konto auf Business/Creator
   umstellen und mit der Facebook-Seite verknüpfen.
2. App-Berechtigungen (App Review): `pages_manage_posts`, `pages_read_engagement`,
   `instagram_basic`, `instagram_content_publish`.
3. Langlebige Access Tokens erzeugen (Page Token bzw. IG User Token) und als env setzen.
4. `SOCIAL_PUBLISHING_PROVIDER=meta`, `SOCIAL_PUBLISHING_CRON_ENABLED=true`.
5. Medien-URLs müssen öffentlich erreichbar sein (Produktions-Domain, keine localhost-URLs).

## Spätere Erweiterungen

- **Reels/Stories/Karussells:** `SocialPostType` im Publisher-Interface erweitern; der
  IG-Container-Flow (`media` → `media_publish`) trägt alle Typen, Facebook analog.
- Weitere Plattformen: neues `SocialPlatform`-Enum-Mitglied + Publisher-Implementierung.
- Best-Time-Vorschläge, Insights (`instagram_manage_insights`), Kommentar-Moderation.

## Tests

- Unit: Statusmaschine, RBAC, Zod-Schemas, Mock-Publisher, Meta-Error-Mapping,
  Scheduler-Idempotenz (In-Memory-CAS-Fake).
- E2E: `apps/e2e/tests/social-media-planner.spec.ts` (Planner, Prefill, Planen,
  Bearbeiten, Löschen, Retry, RBAC, Publish-Sperre) — komplett gegen den Mock-Provider.

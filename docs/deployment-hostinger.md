# Deployment auf Hostinger (VPS)

Der VPS `186.240.146.22` (teilt sich den Host mit shapeandflow, siehe `/opt/README.md`
auf dem Server) trägt beide Umgebungen als eigene Docker-Compose-Projekte:

| Umgebung | Frontend (Nuxt)           | Backend (API)                 | Ports Web/API/DB | Deploy                          |
| -------- | ------------------------- | ----------------------------- | ---------------- | ------------------------------- |
| prod     | https://kaliberbox.de     | https://api.kaliberbox.de     | `3100/3101/3102` | GitHub-Release (release-please) |
| dev      | https://dev.kaliberbox.de | https://api.dev.kaliberbox.de | `3110/3111/3112` | jeder Push auf `main`           |

Frontend und Backend sind getrennte Images (`ghcr.io/schrrobe/kaliberbox-web`,
`ghcr.io/schrrobe/kaliberbox-api`) und Container mit eigenem Host. Der Shop-Host leitet
`/api/` zusätzlich an die API weiter, damit der Browser same-origin bleibt (Admin-Cookies,
kein CORS, Produktbilder trotz helmet-CORP). Webhooks zeigen auf den API-Host, z. B.
`https://api.kaliberbox.de/api/webhooks/stripe`.

Beide dev-Hosts sind per HTTP-Basic-Auth geschützt (`/etc/nginx/kaliberbox-dev.htpasswd`,
User `kaliberbox`), ausgenommen `/api/webhooks/`.

## Ablauf

1. PR nach `main` mergen → Workflow **Release & Deploy** baut beide Images (Tag = Commit-SHA)
   und rollt sie auf dev aus.
2. release-please pflegt **je Paket einen eigenen Release-PR** (Version + `CHANGELOG.md` im
   Paketordner) aus den Conventional Commits (`feat:` → Minor, `fix:` → Patch,
   `feat!:` → Breaking). Ein Commit gehört zu dem Paket, dessen Dateien er ändert.
3. Release-PRs mergen:
   - **API** (`api-vX.Y.Z`) → dasselbe API-Image, das gerade auf dev läuft, wird
     umgetaggt und auf prod ausgerollt. Nur der API-Container wird neu gestartet.
   - **Web** (`web-vX.Y.Z`) → Web-Image mit Prod-URL neu gebaut, nur der Web-Container
     wird neu gestartet. Kommen API und Web im selben Push, geht die API zuerst live.
   - **`packages/*`** (`utils-v…`, `validators-v…` …) → kein Deploy. Über das Plugin
     `node-workspace` bekommen die abhängigen Apps automatisch einen Patch-Bump in
     ihrem eigenen Release-PR.

Neue Frontend-Features, die neue API-Endpunkte brauchen: **zuerst den API-Release-PR
mergen**, dann den Web-PR. release-please prüft das nicht. Beim allerersten prod-Deploy
muss die API zuerst released werden (Web wartet auf eine gesunde API).

PR-Titel müssen deshalb Conventional Commits sein (Squash-Merge übernimmt den Titel).

## Bausteine

| Datei                                  | Zweck                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `Dockerfile`                           | Targets `api` (tsx, `prisma migrate deploy` beim Start) und `web` (Nitro)   |
| `deploy/docker-compose.yml`            | Postgres + API + Web je Umgebung, Ports nur auf `127.0.0.1`                 |
| `deploy/deploy.sh`                     | auf dem VPS `/usr/local/bin/kaliberbox-deploy <prod\|dev> <ref> [api\|web]` |
| `deploy/nginx-*.conf`                  | nginx-Sites inkl. Basic-Auth für dev                                        |
| `deploy/setup-vps.sh`                  | einmaliges, idempotentes Server-Setup                                       |
| `.github/workflows/release-deploy.yml` | Build, release-please, Deploy                                               |

Auf dem Server:

```
/opt/kaliberbox/<env>/.env                 # Compose- und API-Konfiguration (kaliberbox, 600)
/opt/kaliberbox/<env>/web.env              # optional: NUXT_PUBLIC_* für das Frontend
/opt/kaliberbox/<env>/docker-compose.yml   # wird bei jedem Deploy aus dem Tag geladen
```

Daten liegen in Docker-Volumes (`kaliberbox-<env>_pgdata`, `_uploads`, `_invoices`).
Der CI-Key in `/home/kaliberbox/.ssh/authorized_keys` darf ausschließlich
`kaliberbox-deploy` aufrufen; das GITHUB_TOKEN für ghcr kommt per stdin und wird nur in
einem temporären `DOCKER_CONFIG` benutzt.

Änderungen an `deploy/nginx-*.conf`, `deploy/deploy.sh` oder `deploy/setup-vps.sh` werden
**nicht** automatisch ausgerollt: Dateien auf den Server kopieren und
`sudo bash setup-vps.sh <ci-key.pub>` erneut ausführen (überschreibt keine env-Dateien,
Passwörter oder Zertifikate).

## Häufige Handgriffe

```bash
# Manuell (re)deployen — Images müssen in ghcr existieren
# (API-Image-Tag = <ref>, Web-Image-Tag = <ref>-<env>)
sudo -u kaliberbox kaliberbox-deploy dev <commit-sha>          # beide
sudo -u kaliberbox kaliberbox-deploy prod api-v0.2.0 api       # nur API

# Rollback: älteren Tag nur für den betroffenen Dienst deployen
sudo -u kaliberbox kaliberbox-deploy prod web-v0.3.1 web

# Logs / Status
cd /opt/kaliberbox/prod && sudo -u kaliberbox docker compose logs -f api
docker ps --filter name=kaliberbox

# psql
docker exec -it kaliberbox-postgres-prod psql -U kaliberbox

# Admin einmalig anlegen (BOOTSTRAP_ADMIN_* in .env setzen, danach wieder entfernen)
docker exec kaliberbox-api-prod node_modules/.bin/tsx prisma/bootstrap-admin.ts

# Demo-Daten auf dev
docker exec kaliberbox-api-dev node_modules/.bin/tsx prisma/seed.ts
```

Migrationen laufen bei jedem API-Start (`prisma migrate deploy`). Kein
`CREATE INDEX CONCURRENTLY` in Migrationen — das bricht den Start ab.

Backups: `kaliberbox-postgres-{prod,dev}` sind im nächtlichen `/usr/local/bin/pg-backup.sh`
eingetragen (`/var/backups/postgres/kaliberbox-<env>_*.sql.gz`). Uploads und Rechnungen
liegen in Volumes und sind darin **nicht** enthalten.

## Datenbank

Jede Umgebung hat ihren eigenen Postgres-Container (`kaliberbox-postgres-<env>`, DB und
User `kaliberbox`, Passwort = `POSTGRES_PASSWORD` in der env-Datei). Das Schema legt die
API bei jedem Start per `prisma migrate deploy` an bzw. migriert es.

Postgres lauscht nur auf `127.0.0.1` des VPS (prod `3102`, dev `3112`). GUI-Clients wie
DBeaver verbinden sich per SSH-Tunnel:

- **Main:** Host `localhost`, Port `3102`/`3112`, Database `kaliberbox`, User `kaliberbox`
- **SSH:** Host `186.240.146.22`, Port `22`, User `robert`, Public Key mit expliziter
  Key-Datei — fail2ban sperrt nach 3 Fehlversuchen für eine Stunde

## GitHub-Secrets

`DEPLOY_SSH_KEY` (privater CI-Key), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan` des VPS),
`DEPLOY_HOST` (`186.240.146.22`). Unter _Settings → Actions → General_ muss
„Allow GitHub Actions to create and approve pull requests“ aktiv sein (release-please).

## Produktions-Checkliste

- [ ] `/opt/kaliberbox/prod/.env`: Stripe-Live-Keys, Firmen-/Bankdaten (`COMPANY_*`,
      `BANK_*`), Resend — die API verweigert mit `NODE_ENV=production` den Start mit Platzhaltern
- [ ] `/opt/kaliberbox/prod/web.env`: `NUXT_PUBLIC_COMPANY_*` fürs Impressum
- [ ] Stripe-Webhook auf `https://api.kaliberbox.de/api/webhooks/stripe`
- [ ] Bitcoin bleibt mit `BITCOIN_ENABLED=false` aus, bis ein echter Provider implementiert ist
- [ ] Admin einmalig über `bootstrap-admin` anlegen; `prisma:seed` ist in Produktion gesperrt
- [ ] Backup der Volumes `uploads`/`invoices`

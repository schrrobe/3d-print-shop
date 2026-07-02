# Deployment auf Hostinger

Empfohlen: **Hostinger VPS** (Shared/Webhosting reicht nicht — Node-Prozesse, PostgreSQL
und Webhooks werden benötigt).

## Setup (Ubuntu-VPS)

```bash
# 1. Grundausstattung
apt update && apt install -y git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt install -y nodejs
corepack enable && corepack prepare pnpm@11 --activate
# Docker für PostgreSQL (oder Managed-DB nutzen)
curl -fsSL https://get.docker.com | sh

# 2. Projekt
git clone https://github.com/<user>/3d-print-shop.git /opt/print-shop
cd /opt/print-shop
cp .env.example .env        # echte Werte eintragen (Secrets NIE committen)
pnpm install --frozen-lockfile
docker compose up -d db
pnpm --filter @print-shop/api prisma:deploy
pnpm --filter @print-shop/api prisma:seed      # optional (Admin-User!)

# 3. Builds
pnpm --filter @print-shop/web build            # → apps/web/.output
```

## Prozesse (systemd oder pm2)

```ini
# /etc/systemd/system/print-shop-api.service
[Service]
WorkingDirectory=/opt/print-shop/apps/api
EnvironmentFile=/opt/print-shop/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always

# /etc/systemd/system/print-shop-web.service
[Service]
WorkingDirectory=/opt/print-shop/apps/web
Environment=NODE_ENV=production PORT=3000
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
```

## Nginx-Reverse-Proxy

```nginx
server {
  server_name shop.example.com;
  client_max_body_size 60m;                      # 50-MB-Uploads + Overhead

  location /api/ { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; }
  location /     { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```

TLS: `certbot --nginx -d shop.example.com`.

## Produktions-Checkliste

- [ ] `JWT_SECRET` neu generieren (`openssl rand -hex 32`), `COOKIE_SECURE=true`
- [ ] Starkes DB-Passwort; Postgres nicht öffentlich exponieren
- [ ] `RESEND_API_KEY` + verifizierte Absenderdomain
- [ ] Stripe-Live-Keys + Webhook auf `https://…/api/webhooks/stripe`
- [ ] Bitcoin: echten Provider implementieren (docs/payments.md) oder Methode deaktivieren
- [ ] Admin-Seed-Passwort ändern, Beispiel-Daten entfernen
- [ ] Rechtstexte (Impressum/Datenschutz/AGB) + USt-Angaben auf Rechnungen
- [ ] Backups: `pg_dump`-Cron + `uploads/`- und `invoices/`-Verzeichnisse sichern
- [ ] `UPLOAD_DIR`/`INVOICE_DIR` auf persistente Pfade außerhalb des Repos legen

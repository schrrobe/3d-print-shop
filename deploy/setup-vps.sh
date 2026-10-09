#!/usr/bin/env bash
# One-time (idempotent) VPS setup for kaliberbox. Run as root next to the other deploy/ files:
#   sudo bash setup-vps.sh <ci-deploy-key.pub>
# Never overwrites existing env files, the htpasswd file or certificates.
set -euo pipefail
cd "$(dirname "$0")"
CI_PUBKEY=$(cat "$1")

# --- deploy user: owns the stacks, CI key may only run kaliberbox-deploy ------
id kaliberbox >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash kaliberbox
usermod -aG docker kaliberbox
install -m 755 deploy.sh /usr/local/bin/kaliberbox-deploy
install -d -o kaliberbox -g kaliberbox -m 700 /home/kaliberbox/.ssh
printf 'restrict,command="/usr/local/bin/kaliberbox-deploy" %s\n' "$CI_PUBKEY" \
  | install -o kaliberbox -g kaliberbox -m 600 /dev/stdin /home/kaliberbox/.ssh/authorized_keys

# --- per-environment config --------------------------------------------------
write_env() { # <env> <web-port> <api-port> <db-port> <node-env> <site-url> <api-url>
  local dir=/opt/kaliberbox/$1
  install -d -o kaliberbox -g kaliberbox -m 750 "$dir"
  [[ -e $dir/.env ]] || create_env "$@"
  # Added after the first setup, so also appended to existing files.
  grep -q '^DB_PORT_PUBLISH=' "$dir/.env" || echo "DB_PORT_PUBLISH=$4" >>"$dir/.env"
}

create_env() {
  local dir=/opt/kaliberbox/$1 db_pw jwt
  db_pw=$(openssl rand -hex 24)
  jwt=$(openssl rand -hex 32)
  # Printed once, at creation, so the operator can store them.
  echo "$1 POSTGRES_PASSWORD=$db_pw"
  echo "$1 JWT_SECRET=$jwt"
  install -o kaliberbox -g kaliberbox -m 600 /dev/stdin "$dir/.env" <<EOF
# Compose stack
STACK_ENV=$1
API_TAG=none
WEB_TAG=none
WEB_PORT=$2
API_PORT_PUBLISH=$3
POSTGRES_PASSWORD=$db_pw

# API (see apps/api/src/env.ts and .env.example for every option)
NODE_ENV=$5
WEB_URL=$6
API_URL=$7
JWT_SECRET=$jwt
COOKIE_SECURE=true
BITCOIN_ENABLED=false
EOF
}
write_env dev 3110 3111 3112 development https://dev.kaliberbox.de https://api.dev.kaliberbox.de
write_env prod 3100 3101 3102 production https://kaliberbox.de https://api.kaliberbox.de

# --- nginx + certificates ------------------------------------------------------
htpasswd=/etc/nginx/kaliberbox-dev.htpasswd
if [[ ! -e $htpasswd ]]; then
  pw=$(openssl rand -base64 18)
  htpasswd -bcB "$htpasswd" kaliberbox "$pw" 2>/dev/null
  chown root:www-data "$htpasswd" && chmod 640 "$htpasswd"
  echo "dev basic auth: kaliberbox / $pw"
fi

for site in kaliberbox.de dev.kaliberbox.de; do
  src=nginx-$site.conf
  if [[ ! -e /etc/letsencrypt/live/$site/fullchain.pem ]]; then
    # Serve only the :80 block (ACME webroot) until the certificate exists.
    awk '/^server \{/{n++} n==1' "$src" > "/etc/nginx/sites-available/$site"
    ln -sfn "/etc/nginx/sites-available/$site" "/etc/nginx/sites-enabled/$site"
    nginx -t && systemctl reload nginx
    # shellcheck disable=SC2046 # word-split the "-d host" list from the file header
    certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos \
      $(grep -oE '(-d [a-z.]+ ?)+' "$src" | head -1)
  fi
  install -m 644 "$src" "/etc/nginx/sites-available/$site"
  ln -sfn "/etc/nginx/sites-available/$site" "/etc/nginx/sites-enabled/$site"
done
nginx -t && systemctl reload nginx

# --- nightly backups (existing /usr/local/bin/pg-backup.sh) -------------------
grep -q kaliberbox-postgres-prod /usr/local/bin/pg-backup.sh \
  || sed -i 's|"sf-booking-postgres-dev:dev"; do|"sf-booking-postgres-dev:dev" "kaliberbox-postgres-prod:kaliberbox-prod" "kaliberbox-postgres-dev:kaliberbox-dev"; do|' \
    /usr/local/bin/pg-backup.sh
grep -q kaliberbox-postgres-prod /usr/local/bin/pg-backup.sh || echo "WARN: add kaliberbox to pg-backup.sh by hand" >&2

echo "setup done"

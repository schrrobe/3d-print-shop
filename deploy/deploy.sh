#!/usr/bin/env bash
# Rolls one environment (or one of its services) to images already pushed to ghcr.io.
# Installed on the VPS as /usr/local/bin/kaliberbox-deploy, run as user kaliberbox:
#   kaliberbox-deploy <prod|dev> <git-ref> [api|web]     (default: both)
# Image tags: api = <git-ref>, web = <git-ref>-<env> (Nuxt bakes the site URL in).
# CI reaches it through a forced SSH command (args in SSH_ORIGINAL_COMMAND) and pipes a
# short-lived GITHUB_TOKEN on stdin for the registry login; manual runs skip the login.
set -euo pipefail

usage() { echo "usage: kaliberbox-deploy <prod|dev> <git-ref> [api|web]" >&2; exit 64; }
read -r ENV REF SERVICE EXTRA <<<"${SSH_ORIGINAL_COMMAND:-$*}"
case "${ENV:-}" in prod | dev) ;; *) usage ;; esac
case "${SERVICE:=all}" in api | web | all) ;; *) usage ;; esac
[[ -z "${EXTRA:-}" && "${REF:-}" =~ ^[A-Za-z0-9._-]+$ ]] || usage

DIR=/opt/kaliberbox/$ENV
cd "$DIR"
exec 9>.deploy.lock
flock 9

# Per-run registry credentials: never written to the user's persistent docker config.
DOCKER_CONFIG=$(mktemp -d)
export DOCKER_CONFIG
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
TOKEN=$([[ -t 0 ]] || cat)
if [[ -n "$TOKEN" ]]; then
  printf '%s' "$TOKEN" | docker login ghcr.io -u schrrobe --password-stdin >/dev/null
fi

# One-time migration from the single IMAGE_TAG layout (api and web released together).
if ! grep -q '^API_TAG=' .env; then
  old=$(sed -n 's/^IMAGE_TAG=//p' .env)
  web=none
  [[ ${old:-none} != none ]] && web=$old-$ENV
  printf 'API_TAG=%s\nWEB_TAG=%s\n' "${old:-none}" "$web" >>.env
  sed -i '/^IMAGE_TAG=/d' .env
fi

# The compose file is versioned with the release it deploys.
curl -fsSL -o docker-compose.yml \
  "https://raw.githubusercontent.com/schrrobe/3d-print-shop/$REF/deploy/docker-compose.yml"

# Shell env beats .env for interpolation; .env only records a tag once it is up.
if [[ $SERVICE != web ]]; then export API_TAG=$REF; fi
if [[ $SERVICE != api ]]; then export WEB_TAG=$REF-$ENV; fi
export IMAGE_TAG=$REF # compose files from before the api/web split (rollbacks)
if [[ $SERVICE == all ]]; then
  docker compose pull --quiet
  docker compose up -d --wait --remove-orphans
else
  # --no-deps: a web release must not recreate the API (its env_file changed with WEB_TAG).
  docker compose pull --quiet "$SERVICE"
  docker compose up -d --wait --no-deps "$SERVICE"
fi
if [[ $SERVICE != web ]]; then sed -i "s/^API_TAG=.*/API_TAG=$API_TAG/" .env; fi
if [[ $SERVICE != api ]]; then sed -i "s/^WEB_TAG=.*/WEB_TAG=$WEB_TAG/" .env; fi

# docker rmi refuses images a container (either environment) still uses.
docker images -q --filter "reference=ghcr.io/schrrobe/kaliberbox-*" | xargs -r docker rmi >/dev/null 2>&1 || true
echo "==> $ENV $SERVICE running $REF"

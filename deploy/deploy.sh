#!/usr/bin/env bash
# Rolls one environment to an image tag already pushed to ghcr.io.
# Installed on the VPS as /usr/local/bin/kaliberbox-deploy, run as user kaliberbox:
#   kaliberbox-deploy <prod|dev> <image-tag>
# CI reaches it through a forced SSH command (args in SSH_ORIGINAL_COMMAND) and pipes a
# short-lived GITHUB_TOKEN on stdin for the registry login; manual runs skip the login.
set -euo pipefail

read -r ENV TAG EXTRA <<<"${SSH_ORIGINAL_COMMAND:-$*}"
case "${ENV:-}" in prod | dev) ;; *) echo "usage: kaliberbox-deploy <prod|dev> <tag>" >&2; exit 64 ;; esac
[[ -z "${EXTRA:-}" && "${TAG:-}" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "invalid tag" >&2; exit 64; }

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

# The compose file is versioned with the release it deploys.
curl -fsSL -o docker-compose.yml \
  "https://raw.githubusercontent.com/schrrobe/3d-print-shop/$TAG/deploy/docker-compose.yml"

# Shell env beats .env for interpolation; .env only records the tag once it is up.
export IMAGE_TAG=$TAG
docker compose pull --quiet
docker compose up -d --wait --remove-orphans
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" .env

# docker rmi refuses images a container (either environment) still uses.
docker images -q --filter "reference=ghcr.io/schrrobe/kaliberbox-*" | xargs -r docker rmi >/dev/null 2>&1 || true
echo "==> $ENV running $TAG"

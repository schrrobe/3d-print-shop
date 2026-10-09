# syntax=docker/dockerfile:1
# Two images from one monorepo build context:
#   docker build --target api .
#   docker build --target web --build-arg SITE_URL=https://kaliberbox.de .

FROM node:24.18-bookworm-slim AS base
LABEL org.opencontainers.image.source=https://github.com/schrrobe/3d-print-shop
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# openssl: Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /app
COPY . .

# --- API: runs TypeScript via tsx; workspace packages ship as TS sources -------
FROM base AS api
RUN pnpm install --frozen-lockfile --filter "@print-shop/api..." \
  && pnpm --filter @print-shop/api prisma:generate \
  && install -d -o node -g node /data/uploads /data/invoices
ENV NODE_ENV=production API_PORT=3001 UPLOAD_DIR=/data/uploads INVOICE_DIR=/data/invoices
WORKDIR /app/apps/api
USER node
EXPOSE 3001
# Single API replica per environment, so migrating on start cannot race.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node_modules/.bin/tsx src/index.ts"]

# --- Web: Nuxt bakes SITE_URL into i18n canonical/hreflang links at build time ---
FROM base AS web-build
ARG SITE_URL
ENV NUXT_PUBLIC_SITE_URL=$SITE_URL API_PROXY_TARGET=http://api:3001/api
RUN pnpm install --frozen-lockfile --filter "@print-shop/web..." \
  && pnpm --filter @print-shop/web build

FROM node:24.18-bookworm-slim AS web
LABEL org.opencontainers.image.source=https://github.com/schrrobe/3d-print-shop
COPY --from=web-build --chown=node:node /app/apps/web/.output /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 API_PROXY_TARGET=http://api:3001/api
USER node
EXPOSE 3000
CMD ["node", "/app/server/index.mjs"]

# 3D Print Shop

DSGVO-konformer Onlineshop für 3D-Druck-Artikel — Monorepo (Nuxt 4, Express 5, Prisma/PostgreSQL, Turborepo).

> Vollständige Dokumentation folgt in diesem README und unter `docs/` (im Aufbau).

## Quickstart

```bash
# Voraussetzungen: Node 24 (asdf: .tool-versions), pnpm 11, Docker
pnpm install
cp .env.example .env
pnpm db:up          # PostgreSQL via Docker
pnpm db:migrate     # Prisma-Migration
pnpm db:seed        # Beispieldaten
pnpm dev            # web (3000) + api (3001)
```

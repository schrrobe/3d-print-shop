---
name: migration
description: Create and apply a Prisma migration for @print-shop/api using this repo's hand-authored SQL workflow. Use whenever apps/api/prisma/schema.prisma changes or a new migration directory is needed.
---

# Prisma migration (hand-authored SQL)

`prisma migrate dev` does **not** work in this repo — it needs a shadow database
the local Postgres container does not provide, and it fails after partially
writing state. Ignore the `pnpm db:migrate` line in `docs/database.md`.
Migrations are hand-authored and applied with `migrate deploy`.

## Prerequisites

```bash
pnpm db:up   # Postgres on 127.0.0.1:15433 (see docker-compose.yml)
```

`DATABASE_URL` comes from `.env`. It must point at a local host and a database
whose name contains `printshop` or `test` — `apps/api/src/lib/database-reset-guard.ts`
refuses anything else.

## Steps

1. **Edit the schema** — `apps/api/prisma/schema.prisma`. The Prisma model and
   the SQL must describe the same result; nothing reconciles them for you.

2. **Create the migration directory**

   ```text
   apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_<snake_case_name>/migration.sql
   ```

   The timestamp must sort after the newest existing directory:

   ```bash
   rtk ls apps/api/prisma/migrations | tail -3
   ```

3. **Write `migration.sql`** by hand. Open with a `--` comment saying _why_ the
   change exists, matching the existing migrations:

   ```sql
   -- Dashboard freshness query orders TrackingEvent by receivedAt; index it so
   -- the lookup stays a cheap index scan as the table grows toward its retention
   -- horizon.
   CREATE INDEX "TrackingEvent_receivedAt_idx" ON "TrackingEvent"("receivedAt");
   ```

   Quote identifiers — Prisma model/field names are case-sensitive in Postgres.

4. **Apply and regenerate**

   ```bash
   rtk pnpm --filter @print-shop/api prisma:validate
   rtk pnpm --filter @print-shop/api prisma:deploy
   rtk pnpm --filter @print-shop/api prisma:generate
   ```

5. **Verify**

   ```bash
   rtk pnpm --filter @print-shop/api typecheck
   rtk pnpm --filter @print-shop/api test
   ```

   If the change affects seeded data, also `pnpm db:seed`.

## Hard rules

- **Never `CREATE INDEX CONCURRENTLY`** (or any other statement that cannot run
  inside a transaction). Prisma wraps each migration in one; `migrate deploy`
  aborts mid-migration and CI goes red. Use a plain `CREATE INDEX`.
- **Never `prisma migrate dev`**, `migrate reset`, or `db push`.
- **Never edit an already-applied migration.** Add a new one.
- One migration = one logical change. CI runs `prisma:deploy` from scratch in
  the e2e job (`apps/e2e/global-setup.ts`), so every migration must apply to an
  empty database in order.

## Destructive changes

Dropping or renaming a column loses data. Split it: additive migration → code
writing both shapes → backfill → removal migration. State that plan before
writing SQL that drops anything.

---
name: e2e
description: Run Playwright e2e specs from apps/e2e — a single spec, a filtered test, or the full suite — and read the failure output. Use when an e2e test fails or a change needs browser-level verification.
disable-model-invocation: true
---

# Playwright e2e (`apps/e2e`)

Takes a spec name or test-title filter as argument. With no argument, list the
available specs (`rtk ls apps/e2e/tests`) and ask which one.

## Prerequisite

```bash
pnpm db:up   # Postgres on 127.0.0.1:15433 — required, nothing starts it for you
```

Everything else is automatic:

- `playwright.config.ts` `webServer` boots the API (3001) and Nuxt (3000), and
  reuses already-running dev servers locally (`reuseExistingServer`).
- `global-setup.ts` runs `prisma:deploy` → `prisma:reset-data` → `prisma:seed`
  with `ALLOW_DATABASE_RESET`/`ALLOW_DEMO_SEED` set for that child process only.

Do **not** run the reset or seed scripts by hand, and do not export those
`ALLOW_*` flags into your own shell — the guard in
`apps/api/src/lib/database-reset-guard.ts` is the last line of defence against
truncating a non-fixture database.

## Run

```bash
# one spec
rtk pnpm --filter @print-shop/e2e exec playwright test tests/checkout-stripe.spec.ts

# one test by title
rtk pnpm --filter @print-shop/e2e exec playwright test -g "voucher"

# full suite (what CI runs)
rtk pnpm e2e
```

The suite is serial (`workers: 1`, `fullyParallel: false`) with a 60s timeout
per test, and locale `de-DE` — assertions see German UI strings.

## Debug a failure

```bash
# watch it in a browser
rtk pnpm --filter @print-shop/e2e exec playwright test tests/cart.spec.ts --headed

# step through
pnpm --filter @print-shop/e2e exec playwright test tests/cart.spec.ts --debug

# pick apart the trace (retained on failure)
pnpm --filter @print-shop/e2e exec playwright show-report
```

Artifacts land in `apps/e2e/playwright-report/` and `apps/e2e/test-results/`
(both gitignored). Use `--debug` and `show-report` without the `rtk` prefix —
they are interactive.

Locally `retries: 0`, in CI `retries: 2`. A test that only passes on retry is a
flake, not a pass — say so instead of moving on.

## Conventions

- Page objects live in `apps/e2e/pages/`, shared setup in `apps/e2e/helpers/`,
  fixtures in `apps/e2e/fixtures/`. Reuse them; do not inline raw selectors when
  a page object already covers the screen.
- Accessibility checks use `@axe-core/playwright` (`tests/accessibility.spec.ts`).
- Mock-provider failure injection uses the `[e2e-fail]` marker (see
  `docs/testing.md`).

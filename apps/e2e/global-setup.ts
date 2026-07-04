import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Deterministic e2e database state:
 * 1. apply migrations (idempotent), 2. truncate app tables, 3. re-seed.
 * Runs against the local docker / CI service Postgres only.
 */
export default function globalSetup(): void {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const env = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://printshop:printshop@localhost:15433/printshop?schema=public',
  }
  const run = (command: string) => execSync(command, { cwd: repoRoot, env, stdio: 'inherit' })
  run('pnpm --filter @print-shop/api prisma:deploy')
  run('pnpm --filter @print-shop/api prisma:reset-data')
  run('pnpm --filter @print-shop/api prisma:seed')
}

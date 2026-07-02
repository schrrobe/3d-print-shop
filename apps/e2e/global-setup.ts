import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Resets and seeds the database so every e2e run starts deterministic. */
export default function globalSetup(): void {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const env = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://printshop:printshop@localhost:5432/printshop?schema=public',
  }
  execSync(
    'pnpm --filter @print-shop/api exec prisma migrate reset --force --skip-generate',
    { cwd: repoRoot, env, stdio: 'inherit' },
  )
}

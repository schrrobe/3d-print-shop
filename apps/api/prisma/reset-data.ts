import { PrismaClient } from '@prisma/client'
import { assertSafeDatabaseReset } from '../src/lib/database-reset-guard.js'

/**
 * Test-fixture cleanup: truncates all application tables (keeps the schema
 * and _prisma_migrations). Used by the e2e global setup before re-seeding.
 * Only ever meant for local/CI test databases.
 */
const prisma = new PrismaClient()

async function main() {
  assertSafeDatabaseReset(process.env)
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `
  if (tables.length === 0) return
  const list = tables.map((t) => `"${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  console.log(`Truncated ${tables.length} tables.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

import { describe, expect, it } from 'vitest'
import { assertSafeDatabaseReset } from '../src/lib/database-reset-guard.js'

describe('database reset guard', () => {
  it('allows an explicitly confirmed local fixture database', () => {
    expect(() =>
      assertSafeDatabaseReset({
        ALLOW_DATABASE_RESET: 'true',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:15433/printshop_test',
      }),
    ).not.toThrow()
  })

  it.each([
    [{ NODE_ENV: 'test', DATABASE_URL: 'postgresql://user:pass@localhost/printshop' }],
    [
      {
        ALLOW_DATABASE_RESET: 'true',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost/printshop',
      },
    ],
    [
      {
        ALLOW_DATABASE_RESET: 'true',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@db.example.com/printshop',
      },
    ],
  ])('rejects unsafe environment %#', (env) => {
    expect(() => assertSafeDatabaseReset(env)).toThrow(/refused/i)
  })
})

export interface DatabaseResetEnvironment {
  ALLOW_DATABASE_RESET?: string
  NODE_ENV?: string
  DATABASE_URL?: string
}

/** Destructive fixture resets are restricted to an explicitly confirmed local database. */
export function assertSafeDatabaseReset(env: DatabaseResetEnvironment): void {
  if (env.ALLOW_DATABASE_RESET !== 'true') {
    throw new Error('Database reset refused: set ALLOW_DATABASE_RESET=true explicitly')
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('Database reset refused in production')
  }
  if (!env.DATABASE_URL) {
    throw new Error('Database reset refused: DATABASE_URL is missing')
  }

  let url: URL
  try {
    url = new URL(env.DATABASE_URL)
  } catch {
    throw new Error('Database reset refused: DATABASE_URL is invalid')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Database reset refused: only PostgreSQL fixture databases are supported')
  }
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
  if (!localHosts.has(url.hostname)) {
    throw new Error(`Database reset refused for non-local host: ${url.hostname}`)
  }
  const database = url.pathname.replace(/^\//, '')
  if (!database || (!database.includes('printshop') && !database.includes('test'))) {
    throw new Error(`Database reset refused for unexpected database: ${database || '(empty)'}`)
  }
}

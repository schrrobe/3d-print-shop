import { format } from 'node:util'
import { prisma } from './prisma.js'

/**
 * Admin error log: every console.warn/console.error line is additionally
 * written to the ErrorLog table (stdout stays the complete source).
 * No external service; rows are purged after RETENTION_DAYS.
 */

export const RETENTION_DAYS = 14
const MAX_LENGTH = 4000
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi

/** Redact e-mail addresses and cap length before persisting. */
export const scrub = (s: string) => s.replace(EMAIL, '***@***').slice(0, MAX_LENGTH)

/** `[tracking] foo` → `tracking` — the repo's log-prefix convention. */
export const contextOf = (message: string) => /^\[([\w:-]+)\]/.exec(message)?.[1] ?? null

type Sink = (row: { level: 'warn' | 'error'; context: string | null; message: string; stack: string | null }) => Promise<unknown>

const dbSink: Sink = (data) => prisma.errorLog.create({ data })

/** Patch console.warn/error once at startup (index.ts) — never in tests. */
export function installErrorLog(sink: Sink = dbSink): void {
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      // Error → message only; its stack goes into its own column
      const message = format(...args.map((a) => (a instanceof Error ? a.message : a)))
      const stack = args.find((a): a is Error => a instanceof Error)?.stack ?? null
      // fire-and-forget; on failure only the original console — never back into the log (loop)
      sink({ level, context: contextOf(message), message: scrub(message), stack: stack ? scrub(stack) : null }).catch(
        (err: unknown) => original('[error-log] not persisted:', err instanceof Error ? err.message : err),
      )
    }
  }
}

export async function purgeErrorLog(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60_000)
  return (await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } })).count
}

/** Hourly purge; idempotent, so overlapping instances are harmless. */
export function startErrorLogPurgeCron(): NodeJS.Timeout {
  const tick = () => purgeErrorLog().catch((err) => console.error('[error-log] purge failed:', err))
  void tick()
  const timer = setInterval(tick, 60 * 60_000)
  timer.unref()
  return timer
}

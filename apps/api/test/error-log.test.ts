import { afterEach, describe, expect, it, vi } from 'vitest'
import { contextOf, installErrorLog, scrub } from '../src/lib/error-log.js'

describe('error log', () => {
  const { warn, error } = console
  afterEach(() => {
    console.warn = warn
    console.error = error
  })

  it('redacts e-mails and caps length', () => {
    expect(scrub('mail to jane.doe+x@example.co.uk failed')).toBe('mail to ***@*** failed')
    expect(scrub('x'.repeat(5000))).toHaveLength(4000)
  })

  it('reads the [tag] prefix as context', () => {
    expect(contextOf('[tracking] maintenance tick failed:')).toBe('tracking')
    expect(contextOf('no prefix')).toBeNull()
  })

  it('persists warn/error lines and still prints them', async () => {
    const printed = vi.fn()
    console.warn = printed
    console.error = printed
    const sink = vi.fn().mockResolvedValue(undefined)
    installErrorLog(sink)

    const err = new Error('boom for a@b.de')
    console.error('[api] GET /x:', err)
    console.warn('plain %s', 'warning')

    expect(printed).toHaveBeenCalledTimes(2)
    expect(sink).toHaveBeenNthCalledWith(1, {
      level: 'error',
      context: 'api',
      message: '[api] GET /x: boom for ***@***',
      stack: expect.stringContaining('Error: boom for ***@***'),
    })
    expect(sink).toHaveBeenNthCalledWith(2, { level: 'warn', context: null, message: 'plain warning', stack: null })
  })

  it('falls back to the original console when the insert fails', async () => {
    const printed = vi.fn()
    console.error = printed
    installErrorLog(() => Promise.reject(new Error('db down')))
    console.error('[api] oops')
    await new Promise((r) => setImmediate(r))
    expect(printed).toHaveBeenLastCalledWith('[error-log] not persisted:', 'db down')
  })
})

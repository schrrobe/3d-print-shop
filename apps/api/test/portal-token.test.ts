import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  hashPortalToken,
  PORTAL_TOKEN_MAX_ACTIVE,
  PORTAL_TOKEN_TTL_DAYS,
} from '../src/middleware/portal-auth.js'

describe('magic-link portal tokens', () => {
  it('hashes tokens with sha256 — the DB never sees plaintext', () => {
    const token = 'test-magic-token-kunde1'
    expect(hashPortalToken(token)).toBe(createHash('sha256').update(token).digest('hex'))
    expect(hashPortalToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashPortalToken(token)).not.toContain(token)
  })

  it('is deterministic (lookups work) and collision-free for different tokens', () => {
    expect(hashPortalToken('a')).toBe(hashPortalToken('a'))
    expect(hashPortalToken('a')).not.toBe(hashPortalToken('b'))
  })

  it('documents the security policy constants', () => {
    expect(PORTAL_TOKEN_TTL_DAYS).toBe(30)
    expect(PORTAL_TOKEN_MAX_ACTIVE).toBe(3)
  })
})

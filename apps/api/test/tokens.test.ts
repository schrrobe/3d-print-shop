import { describe, expect, it } from 'vitest'
import { generateOrderNumber, randomToken } from '../src/lib/tokens.js'

describe('tokens', () => {
  it('generates url-safe random tokens', () => {
    const token = randomToken()
    expect(token.length).toBeGreaterThanOrEqual(32)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(randomToken()).not.toBe(randomToken())
  })

  it('generates order numbers in the PS-<year>-<8 digits> format', () => {
    const number = generateOrderNumber(new Date('2026-07-02'))
    expect(number).toMatch(/^PS-2026-\d{8}$/)
  })
})

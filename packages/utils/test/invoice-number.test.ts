import { describe, expect, it } from 'vitest'
import {
  formatInvoiceNumber,
  nextInvoiceSequence,
  parseInvoiceNumber,
} from '../src/invoice-number.js'

describe('invoice numbers', () => {
  it('formats sequential numbers with zero padding', () => {
    expect(formatInvoiceNumber('RE', 2026, 1)).toBe('RE-2026-00001')
    expect(formatInvoiceNumber('RE', 2026, 42)).toBe('RE-2026-00042')
    expect(formatInvoiceNumber('RE', 2026, 123456)).toBe('RE-2026-123456')
  })

  it('rejects invalid sequences', () => {
    expect(() => formatInvoiceNumber('RE', 2026, 0)).toThrow()
    expect(() => formatInvoiceNumber('RE', 2026, -1)).toThrow()
    expect(() => formatInvoiceNumber('RE', 2026, 1.5)).toThrow()
  })

  it('formats and parses ticket numbers with the TIC prefix', () => {
    expect(formatInvoiceNumber('TIC', 2026, 1)).toBe('TIC-2026-00001')
    expect(parseInvoiceNumber('TIC-2026-00007')).toEqual({
      prefix: 'TIC',
      year: 2026,
      sequence: 7,
    })
  })

  it('parses formatted numbers back', () => {
    expect(parseInvoiceNumber('RE-2026-00042')).toEqual({ prefix: 'RE', year: 2026, sequence: 42 })
    expect(parseInvoiceNumber('nonsense')).toBeNull()
  })

  it('increments within the same year', () => {
    expect(nextInvoiceSequence({ year: 2026, lastSequence: 41 }, 2026)).toEqual({
      year: 2026,
      sequence: 42,
    })
  })

  it('starts at 1 with no counter and resets on year change', () => {
    expect(nextInvoiceSequence(null, 2026)).toEqual({ year: 2026, sequence: 1 })
    expect(nextInvoiceSequence({ year: 2025, lastSequence: 941 }, 2026)).toEqual({
      year: 2026,
      sequence: 1,
    })
  })
})

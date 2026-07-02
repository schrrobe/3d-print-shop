import { describe, expect, it } from 'vitest'
import { deriveBitcoinStatus, isBitcoinPaid } from '../src/bitcoin.js'

describe('bitcoin payment (paid after 2 confirmations)', () => {
  const expected = { expectedSats: 100_000 }

  it('is not paid with 0 or 1 confirmations', () => {
    expect(isBitcoinPaid({ ...expected, receivedSats: 100_000, confirmations: 0 })).toBe(false)
    expect(isBitcoinPaid({ ...expected, receivedSats: 100_000, confirmations: 1 })).toBe(false)
  })

  it('is paid at exactly 2 confirmations with full amount', () => {
    expect(isBitcoinPaid({ ...expected, receivedSats: 100_000, confirmations: 2 })).toBe(true)
    expect(isBitcoinPaid({ ...expected, receivedSats: 100_000, confirmations: 6 })).toBe(true)
  })

  it('is not paid when underpaid, regardless of confirmations', () => {
    expect(isBitcoinPaid({ ...expected, receivedSats: 99_999, confirmations: 6 })).toBe(false)
  })

  it('accepts overpayment', () => {
    expect(isBitcoinPaid({ ...expected, receivedSats: 150_000, confirmations: 2 })).toBe(true)
  })

  it('never treats a zero-amount expectation as paid', () => {
    expect(isBitcoinPaid({ expectedSats: 0, receivedSats: 0, confirmations: 10 })).toBe(false)
  })

  it('derives status progression', () => {
    expect(deriveBitcoinStatus({ ...expected, receivedSats: 0, confirmations: 0 })).toBe(
      'awaiting_payment',
    )
    expect(deriveBitcoinStatus({ ...expected, receivedSats: 100_000, confirmations: 0 })).toBe(
      'unconfirmed',
    )
    expect(deriveBitcoinStatus({ ...expected, receivedSats: 100_000, confirmations: 1 })).toBe(
      'confirming',
    )
    expect(deriveBitcoinStatus({ ...expected, receivedSats: 100_000, confirmations: 2 })).toBe(
      'paid',
    )
    expect(deriveBitcoinStatus({ ...expected, receivedSats: 50_000, confirmations: 2 })).toBe(
      'underpaid',
    )
    expect(
      deriveBitcoinStatus({ ...expected, receivedSats: 0, confirmations: 0, expired: true }),
    ).toBe('expired')
  })

  it('respects a custom confirmation requirement', () => {
    expect(isBitcoinPaid({ ...expected, receivedSats: 100_000, confirmations: 2 }, 3)).toBe(false)
    expect(isBitcoinPaid({ ...expected, receivedSats: 100_000, confirmations: 3 }, 3)).toBe(true)
  })
})

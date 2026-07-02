import type { BitcoinPaymentStatus } from '@print-shop/types'

/** Bitcoin payments count as paid after this many block confirmations. */
export const BITCOIN_REQUIRED_CONFIRMATIONS = 2

export interface BitcoinPaymentSnapshot {
  expectedSats: number
  receivedSats: number
  confirmations: number
  expired?: boolean
}

export function isBitcoinPaid(
  snapshot: BitcoinPaymentSnapshot,
  requiredConfirmations = BITCOIN_REQUIRED_CONFIRMATIONS,
): boolean {
  return (
    snapshot.receivedSats >= snapshot.expectedSats &&
    snapshot.expectedSats > 0 &&
    snapshot.confirmations >= requiredConfirmations
  )
}

export function deriveBitcoinStatus(
  snapshot: BitcoinPaymentSnapshot,
  requiredConfirmations = BITCOIN_REQUIRED_CONFIRMATIONS,
): BitcoinPaymentStatus {
  if (isBitcoinPaid(snapshot, requiredConfirmations)) return 'paid'
  if (snapshot.expired) return 'expired'
  if (snapshot.receivedSats === 0) return 'awaiting_payment'
  if (snapshot.receivedSats < snapshot.expectedSats && snapshot.confirmations > 0)
    return 'underpaid'
  if (snapshot.confirmations === 0) return 'unconfirmed'
  return 'confirming'
}

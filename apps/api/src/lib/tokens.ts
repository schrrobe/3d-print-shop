import { randomBytes, randomInt } from 'node:crypto'

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url')
}

/** Human-friendly order number: PS-<year>-<8 digits>. */
export function generateOrderNumber(now: Date = new Date()): string {
  const digits = String(randomInt(0, 100_000_000)).padStart(8, '0')
  return `PS-${now.getFullYear()}-${digits}`
}

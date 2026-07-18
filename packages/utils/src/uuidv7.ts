/**
 * UUIDv7 generator — time-ordered ids used as tracking session/visitor/event
 * primary keys. Time-prefixing keeps the btree index append-friendly (unlike
 * random v4) which matters as the event table grows. Works in the browser and
 * in Node (both expose Web Crypto's getRandomValues).
 */

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // 48-bit big-endian unix millis timestamp
  const ts = Math.max(0, Math.floor(now))
  bytes[0] = (ts / 2 ** 40) & 0xff
  bytes[1] = (ts / 2 ** 32) & 0xff
  bytes[2] = (ts / 2 ** 24) & 0xff
  bytes[3] = (ts / 2 ** 16) & 0xff
  bytes[4] = (ts / 2 ** 8) & 0xff
  bytes[5] = ts & 0xff

  // version 7 + variant 10xx
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  let hex = ''
  for (let i = 0; i < 16; i += 1) hex += HEX[bytes[i] ?? 0]
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

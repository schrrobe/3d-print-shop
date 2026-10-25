import type { CommissionType, Prisma, SalesChannel, Voucher } from '@prisma/client'
import type { VoucherDto } from '@print-shop/types'
import { checkVoucher } from '@print-shop/utils'

/**
 * First-party ref cookie "<code>.<click unix seconds>". Set without consent: it
 * only serves commission billing, holds no device/person data and never leaves
 * the shop (see docs/privacy-consent.md).
 */
export const REF_COOKIE = 'ps_ref'
export const REF_WINDOW_S = 30 * 24 * 3600
export const CHANNEL_CODE_RE = /^[a-z0-9-]{2,32}$/

// Link previews (messengers, social networks) and crawlers are not clicks.
const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|skype|curl|wget|python|monitor/i
export const isBot = (ua: string | undefined): boolean => !ua || BOT_UA.test(ua)

/** Commission in cents, rounded half-up and never above the base. */
export function commissionFor(
  rule: { commissionType: CommissionType; commissionValue: number },
  baseCents: number,
): number {
  const amount =
    rule.commissionType === 'percent'
      ? Math.round((baseCents * rule.commissionValue) / 10_000)
      : rule.commissionValue
  return Math.max(0, Math.min(amount, baseCents))
}

/** Channel code from the ref cookie, or null when malformed or older than the window. */
export function refCode(cookie: string | undefined, now: Date): string | null {
  const m = /^([a-z0-9-]{2,32})\.(\d{1,12})$/.exec(cookie ?? '')
  if (!m) return null
  const age = now.getTime() / 1000 - Number(m[2])
  // small negative tolerance for clock skew between API instances
  return age >= -300 && age <= REF_WINDOW_S ? m[1]! : null
}

/**
 * Which active channel an order belongs to: a redeemed channel voucher beats the
 * cookie (the influencer's code is the stronger signal); otherwise the last
 * clicked link within the window.
 */
export async function attributeSalesChannel(
  db: Prisma.TransactionClient,
  voucherId: string | null,
  refCookie: string | undefined,
  now: Date,
): Promise<SalesChannel | null> {
  if (voucherId) {
    const viaVoucher = await db.salesChannel.findFirst({ where: { voucherId, active: true } })
    if (viaVoucher) return viaVoucher
  }
  const code = refCode(refCookie, now)
  return code ? db.salesChannel.findFirst({ where: { code, active: true } }) : null
}

/**
 * The channel voucher as cart DTO, if it is redeemable right now. The minimum
 * order value is ignored here — the cart handles it softly, checkout hard.
 */
export function channelVoucherDto(voucher: Voucher | null, now = new Date()): VoucherDto | null {
  if (!voucher || !checkVoucher(voucher, Number.MAX_SAFE_INTEGER, now).ok) return null
  const { code, type, value, minOrderCents } = voucher
  return { code, type, value, minOrderCents }
}

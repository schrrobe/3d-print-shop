import type { Prisma } from '@prisma/client'
import { checkVoucher, type VoucherCheckResult } from '@print-shop/utils'
import type { PromoBannerInput } from '@print-shop/validators'
import { prisma } from '../lib/prisma.js'

type PromoBannerData = Omit<PromoBannerInput, 'enabled'>

const EMPTY: PromoBannerData = { code: null, content: {} }

/** Stored JSON (written only through promoBannerSchema) → typed shape; null → empty. */
export function promoBannerData(json: Prisma.JsonValue | null | undefined): PromoBannerData {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return EMPTY
  return { ...EMPTY, ...(json as unknown as PromoBannerData) }
}

/**
 * Whether the banner's voucher can be redeemed at all right now (min order ignored).
 * No code = info banner, always fine.
 */
export async function promoVoucherCheck(code: string | null): Promise<VoucherCheckResult> {
  if (!code) return { ok: true }
  const voucher = await prisma.voucher.findUnique({ where: { code } })
  return checkVoucher(voucher, Number.MAX_SAFE_INTEGER)
}

/** What the shop gets: null when off or when it would advertise a dead code (e.g. all 20 used). */
export async function publicPromoBanner(): Promise<PromoBannerData | null> {
  const row = await prisma.shopSettings.findUnique({
    where: { id: 'singleton' },
    select: { promoBannerEnabled: true, promoBanner: true },
  })
  if (!row?.promoBannerEnabled) return null
  const data = promoBannerData(row.promoBanner)
  return (await promoVoucherCheck(data.code)).ok ? data : null
}

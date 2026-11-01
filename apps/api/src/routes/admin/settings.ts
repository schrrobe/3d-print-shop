import type { ShopSettings } from '@prisma/client'
import {
  companySettingsSchema,
  promoBannerSchema,
  trackingSettingsSchema,
} from '@print-shop/validators'
import { Router } from 'express'
import { audit } from '../../lib/audit.js'
import { prisma } from '../../lib/prisma.js'
import { requirePermission } from '../../middleware/auth.js'
import {
  COMPANY_COLUMNS,
  company,
  loadCompanySettings,
  missingCompanyFields,
  type CompanyField,
} from '../../services/company.js'
import { promoBannerData, promoVoucherCheck } from '../../services/promo-banner.js'

export const adminSettingsRouter = Router()

const SINGLETON_ID = 'singleton'

const toDto = (
  row: {
    metaPixelId: string | null
    ga4MeasurementId: string | null
    gtmContainerId: string | null
  } | null,
) => ({
  metaPixelId: row?.metaPixelId ?? null,
  ga4MeasurementId: row?.ga4MeasurementId ?? null,
  gtmContainerId: row?.gtmContainerId ?? null,
})

adminSettingsRouter.get(
  '/tracking',
  requirePermission('settings:read'),
  async (_req, res, next) => {
    try {
      const row = await prisma.shopSettings.findUnique({ where: { id: SINGLETON_ID } })
      res.json({ settings: toDto(row) })
    } catch (err) {
      next(err)
    }
  },
)

adminSettingsRouter.put(
  '/tracking',
  requirePermission('settings:write'),
  async (req, res, next) => {
    try {
      const input = trackingSettingsSchema.parse(req.body)
      const row = await prisma.shopSettings.upsert({
        where: { id: SINGLETON_ID },
        create: { id: SINGLETON_ID, ...input },
        update: input,
      })
      // Audit which fields were set/cleared, not the raw IDs (don't log them unnecessarily)
      await audit(
        req,
        'settings.tracking.update',
        { type: 'settings', id: SINGLETON_ID },
        {
          metaPixelId: input.metaPixelId ? 'set' : 'cleared',
          ga4MeasurementId: input.ga4MeasurementId ? 'set' : 'cleared',
          gtmContainerId: input.gtmContainerId ? 'set' : 'cleared',
        },
      )
      res.json({ settings: toDto(row) })
    } catch (err) {
      next(err)
    }
  },
)

const companyDto = (row: Partial<ShopSettings> | null) => {
  const effective = company()
  return {
    // Raw DB values (null = not set here, env fallback applies) for the form…
    settings: {
      ...Object.fromEntries(
        Object.entries(COMPANY_COLUMNS).map(([field, column]) => [field, row?.[column] ?? null]),
      ),
      vatExempt: row?.vatExempt ?? null,
    },
    // …and what invoices actually print right now.
    effective,
    missing: missingCompanyFields(effective),
  }
}

adminSettingsRouter.get('/company', requirePermission('settings:read'), async (_req, res, next) => {
  try {
    const row = await prisma.shopSettings.findUnique({ where: { id: SINGLETON_ID } })
    res.json(companyDto(row))
  } catch (err) {
    next(err)
  }
})

adminSettingsRouter.put('/company', requirePermission('settings:write'), async (req, res, next) => {
  try {
    const { vatExempt, ...input } = companySettingsSchema.parse(req.body)
    const data = {
      ...Object.fromEntries(
        Object.entries(input).map(([field, value]) => [
          COMPANY_COLUMNS[field as CompanyField],
          value,
        ]),
      ),
      ...(vatExempt !== undefined && { vatExempt }),
    }
    const row = await prisma.shopSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    })
    await loadCompanySettings()
    // Field names only — IBAN & co. don't belong in the audit log.
    await audit(
      req,
      'settings.company.update',
      { type: 'settings', id: SINGLETON_ID },
      {
        ...Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v ? 'set' : 'cleared'])),
        vatExempt,
      },
    )
    res.json(companyDto(row))
  } catch (err) {
    next(err)
  }
})

// ---------- Promo banner ----------

const promoDto = async (row: Pick<ShopSettings, 'promoBannerEnabled' | 'promoBanner'> | null) => {
  const data = promoBannerData(row?.promoBanner)
  const check = await promoVoucherCheck(data.code)
  return {
    settings: { enabled: row?.promoBannerEnabled ?? false, ...data },
    // Why the shop hides an enabled banner: its voucher is missing/inactive/expired/used up.
    voucherProblem: check.ok ? null : check.reason,
  }
}

adminSettingsRouter.get(
  '/promo-banner',
  requirePermission('settings:read'),
  async (_req, res, next) => {
    try {
      const row = await prisma.shopSettings.findUnique({ where: { id: SINGLETON_ID } })
      res.json(await promoDto(row))
    } catch (err) {
      next(err)
    }
  },
)

adminSettingsRouter.put(
  '/promo-banner',
  requirePermission('settings:write'),
  async (req, res, next) => {
    try {
      const { enabled, ...promoBanner } = promoBannerSchema.parse(req.body)
      const data = { promoBannerEnabled: enabled, promoBanner }
      const row = await prisma.shopSettings.upsert({
        where: { id: SINGLETON_ID },
        create: { id: SINGLETON_ID, ...data },
        update: data,
      })
      await audit(
        req,
        'settings.promo_banner.update',
        { type: 'settings', id: SINGLETON_ID },
        { enabled, code: promoBanner.code },
      )
      res.json(await promoDto(row))
    } catch (err) {
      next(err)
    }
  },
)

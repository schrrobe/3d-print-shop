import { calcSubtotalCents, calcVoucherDiscountCents, checkVoucher, normalizeVoucherCode } from '@print-shop/utils'
import { voucherValidateSchema } from '@print-shop/validators'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { badRequest } from '../../middleware/error.js'
import { sensitiveLimiter } from '../../middleware/rate-limit.js'

export const vouchersRouter = Router()

/**
 * Cart-side voucher validation. Prices come from the DB (never the client);
 * the checkout re-runs the same check as a hard gate before redeeming.
 */
vouchersRouter.post('/validate', sensitiveLimiter, async (req, res, next) => {
  try {
    const input = voucherValidateSchema.parse(req.body)

    const products = await prisma.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, active: true },
      select: { id: true, priceCents: true },
    })
    const priceById = new Map(products.map((p) => [p.id, p.priceCents]))
    const items = input.items.map((item) => {
      const unitPriceCents = priceById.get(item.productId)
      if (unitPriceCents == null) throw badRequest(`Product not available: ${item.productId}`)
      return { unitPriceCents, quantity: item.quantity }
    })
    const subtotalCents = calcSubtotalCents(items)

    const voucher = await prisma.voucher.findUnique({
      where: { code: normalizeVoucherCode(input.code) },
    })
    const check = checkVoucher(voucher, subtotalCents)
    if (!check.ok) {
      res.json({
        valid: false,
        reason: check.reason,
        ...(check.reason === 'min_order_not_met' ? { minOrderCents: voucher?.minOrderCents } : {}),
      })
      return
    }

    // check.ok implies voucher != null
    const found = voucher!
    res.json({
      valid: true,
      voucher: {
        code: found.code,
        type: found.type,
        value: found.value,
        minOrderCents: found.minOrderCents,
      },
      discountCents: calcVoucherDiscountCents(found, subtotalCents),
    })
  } catch (err) {
    next(err)
  }
})

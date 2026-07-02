import type { CartTotalsDto } from '@print-shop/types'
import { calcShippingCents, isFreeShipping } from './shipping.js'

export interface PricedItem {
  unitPriceCents: number
  quantity: number
}

export function calcSubtotalCents(items: PricedItem[]): number {
  return items.reduce((sum, item) => {
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new Error(`Invalid unit price: ${item.unitPriceCents}`)
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Invalid quantity: ${item.quantity}`)
    }
    return sum + item.unitPriceCents * item.quantity
  }, 0)
}

export function calcCartTotals(items: PricedItem[]): CartTotalsDto {
  const subtotalCents = calcSubtotalCents(items)
  const shippingCents = calcShippingCents(subtotalCents)
  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingApplied: subtotalCents > 0 && isFreeShipping(subtotalCents),
  }
}

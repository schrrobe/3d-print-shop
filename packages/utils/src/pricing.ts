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

/** Surcharge per box for a customer name on the label. */
export const PERSONALIZATION_PRICE_CENTS = 600

export function personalizedUnitPriceCents(priceCents: number, personalization?: string): number {
  return personalization ? priceCents + PERSONALIZATION_PRICE_CENTS : priceCents
}

const PERSONALIZATION_LABEL: Record<string, string> = {
  de: 'Personalisierung',
  en: 'Personalisation',
  pl: 'Personalizacja',
  fr: 'Personnalisation',
  nl: 'Personalisatie',
  cs: 'Personalizace',
}

/** Order-item name snapshot, so invoice, emails, packing list and production show the name. */
export function personalizedItemName(
  name: string,
  personalization: string | undefined,
  locale: string,
): string {
  if (!personalization) return name
  return `${name} – ${PERSONALIZATION_LABEL[locale] ?? PERSONALIZATION_LABEL.de}: ${personalization}`
}

export function calcCartTotals(items: PricedItem[], country: string): CartTotalsDto {
  const subtotalCents = calcSubtotalCents(items)
  const shippingCents = calcShippingCents(subtotalCents, country)
  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingApplied: subtotalCents > 0 && isFreeShipping(subtotalCents, country),
  }
}

/** Who receives the parcel: the order's billing address fields. */
export interface Recipient {
  firstName: string
  lastName: string
  company?: string | null
  street: string
  zip: string
  city: string
  country: string
}

/**
 * Delivery address if support set one (JSON column on Order), else the billing
 * address. Every packing list, delivery note and provider order goes through this.
 */
export function recipientOf(order: Recipient & { deliveryAddress?: unknown }): Recipient {
  return (order.deliveryAddress as Recipient | null | undefined) ?? order
}

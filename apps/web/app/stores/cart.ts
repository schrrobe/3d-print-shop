import type { ColorSelection, VoucherDto, VoucherRejection } from '@print-shop/types'
import { calcCartTotalsWithVoucher } from '@print-shop/utils'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export interface CartLine {
  key: string
  productId: string
  slug: string
  name: string
  unitPriceCents: number
  quantity: number
  colorSelection: ColorSelection
  colorNames: string[]
  imageUrl: string | null
}

const STORAGE_KEY = 'print-shop-cart'
const VOUCHER_STORAGE_KEY = 'print-shop-voucher'

export type ApplyVoucherResult =
  | { valid: true; voucher: VoucherDto; discountCents: number }
  | { valid: false; reason: VoucherRejection; minOrderCents?: number }

function lineKey(productId: string, colorSelection: ColorSelection): string {
  return `${productId}:${JSON.stringify(colorSelection, Object.keys(colorSelection).sort())}`
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartLine[]>([])
  const voucher = ref<VoucherDto | null>(null)
  const hydrated = ref(false)

  function hydrate() {
    if (hydrated.value || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw) as CartLine[]
    } catch {
      items.value = []
    }
    try {
      const rawVoucher = localStorage.getItem(VOUCHER_STORAGE_KEY)
      if (rawVoucher) voucher.value = JSON.parse(rawVoucher) as VoucherDto
    } catch {
      voucher.value = null
    }
    hydrated.value = true
  }

  if (typeof window !== 'undefined') {
    watch(
      items,
      (value) => {
        if (hydrated.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      },
      { deep: true },
    )
    watch(voucher, (value) => {
      if (!hydrated.value) return
      if (value) localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(value))
      else localStorage.removeItem(VOUCHER_STORAGE_KEY)
    })
  }

  const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const totals = computed(() => calcCartTotalsWithVoucher(items.value, voucher.value))

  function add(line: Omit<CartLine, 'key'>) {
    const key = lineKey(line.productId, line.colorSelection)
    const existing = items.value.find((item) => item.key === key)
    if (existing) existing.quantity += line.quantity
    else items.value.push({ ...line, key })
  }

  function setQuantity(key: string, quantity: number) {
    const item = items.value.find((i) => i.key === key)
    if (!item) return
    if (quantity < 1) remove(key)
    else item.quantity = quantity
  }

  function remove(key: string) {
    items.value = items.value.filter((i) => i.key !== key)
  }

  function clear() {
    items.value = []
    voucher.value = null
  }

  /** Server-side validation via /api/vouchers/validate; stores the voucher on success. */
  async function applyVoucher(code: string): Promise<ApplyVoucherResult> {
    const result = await $fetch<ApplyVoucherResult>('/api/vouchers/validate', {
      method: 'POST',
      body: { code, items: toCheckoutItems() },
    })
    if (result.valid) voucher.value = result.voucher
    return result
  }

  function removeVoucher() {
    voucher.value = null
  }

  function toCheckoutItems(): { productId: string; quantity: number; colorSelection: ColorSelection }[] {
    return items.value.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      colorSelection: i.colorSelection,
    }))
  }

  return {
    items,
    voucher,
    count,
    totals,
    hydrate,
    add,
    setQuantity,
    remove,
    clear,
    applyVoucher,
    removeVoucher,
    toCheckoutItems,
  }
})

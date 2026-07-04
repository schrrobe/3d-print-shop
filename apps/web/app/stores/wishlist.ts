import type { ColorSelection } from '@print-shop/types'
import { lineKey } from '@print-shop/utils'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

/**
 * Guest wishlist — local only. There are no customer accounts (Users are staff
 * with RBAC), so there is no server-side merge. Sharing happens through the
 * saved-configuration share links (F8).
 */
export interface WishlistLine {
  key: string
  productId: string
  slug: string
  name: string
  unitPriceCents: number
  colorSelection: ColorSelection
  colorNames: string[]
  imageUrl: string | null
}

const STORAGE_KEY = 'print-shop-wishlist'

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref<WishlistLine[]>([])
  const hydrated = ref(false)

  function hydrate() {
    if (hydrated.value || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) items.value = JSON.parse(raw) as WishlistLine[]
    } catch {
      items.value = []
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
  }

  const count = computed(() => items.value.length)

  function has(productId: string, colorSelection: ColorSelection): boolean {
    const key = lineKey(productId, colorSelection)
    return items.value.some((i) => i.key === key)
  }

  function add(line: Omit<WishlistLine, 'key'>) {
    hydrate()
    const key = lineKey(line.productId, line.colorSelection)
    if (!items.value.some((i) => i.key === key)) items.value.push({ ...line, key })
  }

  function remove(key: string) {
    items.value = items.value.filter((i) => i.key !== key)
  }

  /** Toggle a configuration; returns the new membership state. */
  function toggle(line: Omit<WishlistLine, 'key'>): boolean {
    hydrate()
    const key = lineKey(line.productId, line.colorSelection)
    if (items.value.some((i) => i.key === key)) {
      remove(key)
      return false
    }
    items.value.push({ ...line, key })
    return true
  }

  function clear() {
    items.value = []
  }

  return { items, count, hydrate, has, add, remove, toggle, clear }
})

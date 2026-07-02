import type { ColorZoneSlot } from '@print-shop/types'

export interface ApiTranslation {
  locale: string
  name: string
  description: string
  seoTitle: string | null
  seoDescription: string | null
}

export interface ApiAsset {
  id: string
  type: 'image' | 'glb_preview' | 'production_file'
  url: string
  alt: string | null
}

export interface ApiColorSlot {
  id: string
  slot: ColorZoneSlot
  label: string
  defaultColorId: string | null
}

export interface ApiProduct {
  id: string
  slug: string
  priceCents: number
  active: boolean
  translations: ApiTranslation[]
  assets: ApiAsset[]
  colorSlots: ApiColorSlot[]
}

export interface ApiColor {
  id: string
  name: string
  hex: string
  material: string
  manufacturer: string
  active: boolean
}

export function pickTranslation(product: ApiProduct, locale: string): ApiTranslation {
  return (
    product.translations.find((t) => t.locale === locale) ??
    product.translations.find((t) => t.locale === 'de') ??
    product.translations[0] ?? {
      locale: 'de',
      name: product.slug,
      description: '',
      seoTitle: null,
      seoDescription: null,
    }
  )
}

export function productImage(product: ApiProduct): string | null {
  return product.assets.find((a) => a.type === 'image')?.url ?? null
}

export function productGlb(product: ApiProduct): string | null {
  return product.assets.find((a) => a.type === 'glb_preview')?.url ?? null
}

export function useProducts() {
  return useFetch<{ products: ApiProduct[] }>('/api/products')
}

export function useColors() {
  return useFetch<{ colors: ApiColor[] }>('/api/colors')
}

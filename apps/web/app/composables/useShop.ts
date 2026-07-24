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
  sortOrder?: number
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
  outOfStock?: boolean
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

const PRODUCT_IMAGE_WIDTHS = [320, 640, 960, 1200]

function imageVariantUrl(url: string, width: number): string {
  if (!url.startsWith('/api/product-images/')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}w=${width}`
}

function imageSrcset(url: string): string | undefined {
  if (!url.startsWith('/api/product-images/')) return undefined
  return PRODUCT_IMAGE_WIDTHS.map((width) => `${imageVariantUrl(url, width)} ${width}w`).join(', ')
}

export function productImage(product: ApiProduct, width = 640): string | null {
  const url = product.assets.find((a) => a.type === 'image')?.url
  return url ? imageVariantUrl(url, width) : null
}

export function productImages(product: ApiProduct): {
  url: string
  alt: string | null
  srcset?: string
  sizes?: string
  thumbUrl?: string
}[] {
  return product.assets
    .filter((a) => a.type === 'image')
    .map((a) => ({
      url: imageVariantUrl(a.url, 960),
      alt: a.alt,
      srcset: imageSrcset(a.url),
      sizes: '(min-width: 1024px) 50vw, 100vw',
      thumbUrl: imageVariantUrl(a.url, 160),
    }))
}

export function productGlb(product: ApiProduct): string | null {
  return product.assets.find((a) => a.type === 'glb_preview')?.url ?? null
}

export function useProducts(q?: Ref<string>) {
  return useFetch<{ products: ApiProduct[] }>('/api/products', {
    query: q ? { q: computed(() => q.value.trim() || undefined) } : undefined,
  })
}

export function useColors() {
  return useFetch<{ colors: ApiColor[] }>('/api/colors')
}

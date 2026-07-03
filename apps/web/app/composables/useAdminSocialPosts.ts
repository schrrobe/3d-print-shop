import type { SocialPlatform, SocialPostStatus } from '@print-shop/types'
import type { SocialEditorProduct, SocialPostItem } from '@print-shop/ui'

/** API row shape of /api/admin/social-posts (include: product + createdBy). */
export interface AdminSocialPost {
  id: string
  platform: SocialPlatform
  status: SocialPostStatus
  caption: string
  mediaUrls: string[]
  productId: string | null
  scheduledAt: string | null
  publishedAt: string | null
  errorMessage: string | null
  externalPostId: string | null
  provider: string
  attempts: number
  createdAt: string
  product: {
    id: string
    slug: string
    translations: { locale: string; name: string }[]
    assets: { url: string; alt: string | null }[]
  } | null
  createdBy: { id: string; name: string } | null
}

interface AdminProductRow {
  id: string
  slug: string
  priceCents: number
  translations: { locale: string; name: string; description: string }[]
  assets: { type: string; url: string; alt: string | null }[]
}

export function productName(post: AdminSocialPost): string | null {
  if (!post.product) return null
  return post.product.translations.find((t) => t.locale === 'de')?.name ?? post.product.slug
}

export function toSocialPostItem(post: AdminSocialPost, siteUrl: string): SocialPostItem {
  return {
    id: post.id,
    platform: post.platform,
    status: post.status,
    caption: post.caption,
    mediaUrls: post.mediaUrls,
    productName: productName(post),
    productUrl: post.product ? `${siteUrl.replace(/\/$/, '')}/products/${post.product.slug}` : null,
    scheduledAt: post.scheduledAt,
    publishedAt: post.publishedAt,
    errorMessage: post.errorMessage,
    attempts: post.attempts,
  }
}

/** Produktkatalog fürs Editor-Dropdown (de-Übersetzung, nur Bild-Assets). */
export function toEditorProducts(products: AdminProductRow[]): SocialEditorProduct[] {
  return products.map((product) => {
    const translation =
      product.translations.find((t) => t.locale === 'de') ?? product.translations[0]
    return {
      id: product.id,
      slug: product.slug,
      name: translation?.name ?? product.slug,
      description: translation?.description ?? '',
      priceCents: product.priceCents,
      images: product.assets
        .filter((a) => a.type === 'image')
        .map((a) => ({ url: a.url, alt: a.alt })),
    }
  })
}

/** Lädt ein neues Post-Bild hoch und liefert die servierbare URL zurück. */
export async function uploadSocialMedia(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const data = await $fetch<{ media: { url: string } }>('/api/admin/social-posts/media', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  return data.media.url
}

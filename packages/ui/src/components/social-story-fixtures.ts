import type { SocialPostItem } from '../social.js'

/** Inline SVG placeholder so stories need no external assets. */
export function placeholderImage(color: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/><text x="200" y="210" font-family="sans-serif" font-size="28" fill="#ffffff" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const SAMPLE_POSTS: SocialPostItem[] = [
  {
    id: 'post-draft',
    platform: 'instagram',
    status: 'draft',
    caption: 'Spiralvase — frisch vom Drucker! 🌿 Wasserdicht versiegelt, perfekt für Trockenblumen.',
    mediaUrls: [placeholderImage('#31a871', 'Vase')],
    productName: 'Spiralvase',
    productUrl: 'https://example.com/products/spiral-vase',
    scheduledAt: null,
  },
  {
    id: 'post-scheduled',
    platform: 'facebook',
    status: 'scheduled',
    caption: 'Ordnung auf dem Schreibtisch: unser modularer Desk Organizer in deinen Wunschfarben. 🖥️',
    mediaUrls: [placeholderImage('#1f6fb2', 'Organizer')],
    productName: 'Schreibtisch-Organizer',
    productUrl: 'https://example.com/products/desk-organizer',
    scheduledAt: '2026-07-15T10:00:00.000Z',
  },
  {
    id: 'post-published',
    platform: 'instagram',
    status: 'published',
    caption: 'Wandhaken-Set — bis 5 kg pro Haken, verdeckte Verschraubung.',
    mediaUrls: [placeholderImage('#5e5e5e', 'Haken')],
    productName: 'Wandhaken-Set (3 Stück)',
    productUrl: 'https://example.com/products/wall-hook-set',
    scheduledAt: '2026-07-01T08:00:00.000Z',
    publishedAt: '2026-07-01T08:00:12.000Z',
  },
  {
    id: 'post-failed',
    platform: 'instagram',
    status: 'failed',
    caption: 'Planetengetriebe-Fidget — print-in-place und sofort beweglich. ⚙️',
    mediaUrls: [],
    productName: 'Planetengetriebe-Fidget',
    scheduledAt: '2026-07-02T09:00:00.000Z',
    errorMessage: '[meta_media_error] Instagram posts require at least one image',
    attempts: 2,
  },
]

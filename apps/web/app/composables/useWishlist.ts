import type { ColorSelection } from '@print-shop/types'

/**
 * Wishlist helper: exposes the local store plus the saved-configuration share
 * flow (F8). Sharing a wishlist entry means persisting its configuration and
 * copying the returned public share URL.
 */
export interface SavedConfigurationResponse {
  shareToken: string
  url: string
}

export interface LoadedConfiguration {
  productId: string
  slug: string
  selectedColors: ColorSelection
  availability: Record<string, 'ok' | 'unavailable' | 'out_of_stock'>
}

export function useWishlist() {
  const store = useWishlistStore()

  async function shareConfiguration(input: {
    productId: string
    selectedColors: ColorSelection
    previewImage?: string | null
  }): Promise<SavedConfigurationResponse> {
    return $fetch<SavedConfigurationResponse>('/api/configurations', {
      method: 'POST',
      body: {
        productId: input.productId,
        selectedColors: input.selectedColors,
        previewImage: input.previewImage ?? undefined,
      },
    })
  }

  async function loadConfiguration(shareToken: string): Promise<LoadedConfiguration> {
    return $fetch<LoadedConfiguration>(`/api/configurations/${shareToken}`)
  }

  return { store, shareConfiguration, loadConfiguration }
}

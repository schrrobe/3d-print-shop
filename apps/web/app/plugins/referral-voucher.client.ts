import type { VoucherDto } from '@print-shop/types'
import { useToast } from '@print-shop/ui'

/**
 * Sales-channel links land with ?gutschein=CODE. Put that channel's voucher into
 * the cart. The voucher itself comes from the server via the ref cookie, never
 * from the URL, so the query param is only the trigger.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', async () => {
    const router = useRouter()
    const { gutschein, ...query } = router.currentRoute.value.query
    if (!gutschein) return
    const cart = useCartStore()
    cart.hydrate()
    try {
      const { voucher } = await $fetch<{ voucher: VoucherDto | null }>('/api/vouchers/referral')
      if (voucher) {
        // Latest link wins, like attribution: the channel voucher replaces an older one.
        cart.voucher = voucher
        const i18n = nuxtApp.$i18n as { t: (key: string, params: Record<string, string>) => string }
        useToast().show(i18n.t('cart.voucherFromLink', { code: voucher.code }), {
          variant: 'success',
        })
      }
    } catch {
      // Best effort: the customer can still enter the code by hand.
    }
    await router.replace({ query })
  })
})

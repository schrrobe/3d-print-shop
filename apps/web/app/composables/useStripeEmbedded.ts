import type { StripeEmbeddedCheckout } from '@stripe/stripe-js'

/**
 * Embedded Stripe Checkout: the payment form renders in an iframe inside our
 * page, the customer never leaves the shop (except for redirect-only methods).
 * Card payments finish via onComplete → success page.
 */
export function useStripeEmbedded() {
  const router = useRouter()
  const localePath = useLocalePath()
  const mountEl = ref<HTMLElement | null>(null)
  let checkout: StripeEmbeddedCheckout | null = null
  onBeforeUnmount(() => checkout?.destroy())

  async function mount(
    payment: { clientSecret: string; publishableKey: string },
    order: { orderNumber: string; accessToken: string },
  ) {
    checkout?.destroy()
    const { loadStripe } = await import('@stripe/stripe-js')
    const stripe = await loadStripe(payment.publishableKey)
    if (!stripe) throw new Error('Stripe.js failed to load')
    checkout = await stripe.initEmbeddedCheckout({
      clientSecret: payment.clientSecret,
      onComplete: () => {
        void router.push(
          localePath(`/checkout/success?order=${order.orderNumber}&token=${order.accessToken}`),
        )
      },
    })
    await nextTick()
    if (mountEl.value) checkout.mount(mountEl.value)
  }

  return { mountEl, mount }
}

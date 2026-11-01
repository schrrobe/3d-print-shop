import Stripe from 'stripe'
import { env, isProduction } from '../../env.js'
import { randomToken } from '../../lib/tokens.js'

/**
 * Stripe integration. With STRIPE_SECRET_KEY configured this talks to the real
 * Stripe API; without it (local dev, CI) it returns deterministic mock sessions
 * whose completion can be simulated via POST /api/dev/stripe/complete/:sessionId.
 */
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null

export const stripeConfigured = stripe !== null

export interface StripeCheckoutResult {
  sessionId: string
  url: string
}

/** Mock mode has no embedded form: `url` jumps straight to the success page. */
export type StripeEmbeddedResult =
  | { sessionId: string; clientSecret: string; url?: never }
  | { sessionId: string; url: string; clientSecret?: never }

export interface CheckoutParams {
  orderNumber: string
  accessToken: string
  amountCents: number
  email: string
  locale: string
  description: string
}

function successUrl(params: CheckoutParams): string {
  return `${env.WEB_URL}/checkout/success?order=${params.orderNumber}&token=${params.accessToken}`
}

/** Embedded Checkout session — the payment form renders inside our checkout page. */
export async function createStripeCheckoutSession(
  params: CheckoutParams,
): Promise<StripeEmbeddedResult> {
  if (!stripe) {
    const sessionId = `mock_cs_${randomToken(12)}`
    return { sessionId, url: `${successUrl(params)}&session=${sessionId}&mock=1` }
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: params.amountCents,
          product_data: { name: params.description },
        },
      },
    ],
    metadata: { orderNumber: params.orderNumber },
    ui_mode: 'embedded',
    // Cards complete in place (onComplete); only redirect-based methods use return_url.
    redirect_on_completion: 'if_required',
    return_url: successUrl(params),
    // Matches the kaliberbox light world (apps/web shop.css: --kb-paper, --kb-hit, 2px radii).
    // Archivo isn't offered by Stripe; Inter is the closest grotesque.
    branding_settings: {
      background_color: '#f3f1ea',
      button_color: '#c2410c',
      border_style: 'rectangular',
      font_family: 'inter',
    },
  })
  if (!session.client_secret) throw new Error('Stripe returned no client secret')
  return { sessionId: session.id, clientSecret: session.client_secret }
}

/** Client secret of an existing embedded session (idempotent checkout replay). */
export async function getStripeClientSecret(sessionId: string): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured')
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (!session.client_secret) throw new Error('Stripe session has no client secret')
  return session.client_secret
}

/**
 * Reopens payment for an unpaid order: reuses the open embedded session,
 * otherwise expires/replaces it (expired, or a pre-embedded hosted session).
 * Returns null when the old session is already complete (webhook pending).
 */
export async function resumeStripeCheckoutSession(
  sessionId: string,
  params: CheckoutParams,
): Promise<{ sessionId: string; clientSecret: string } | null> {
  if (!stripe) throw new Error('Stripe is not configured')
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.status === 'complete') return null
  if (session.status === 'open') {
    if (session.ui_mode === 'embedded' && session.client_secret) {
      return { sessionId, clientSecret: session.client_secret }
    }
    // Close the hosted session so the order can't be paid twice.
    await stripe.checkout.sessions.expire(sessionId)
  }
  const fresh = await createStripeCheckoutSession(params)
  if (!fresh.clientSecret) throw new Error('Stripe returned no client secret')
  return { sessionId: fresh.sessionId, clientSecret: fresh.clientSecret }
}

/** Expires a session we created but could not attach to the order (lost race). */
export async function expireStripeCheckoutSession(sessionId: string): Promise<void> {
  await stripe?.checkout.sessions.expire(sessionId)
}

/** Payment link for accepted quotes (Stripe Payment Links or mock). */
export async function createStripePaymentLink(
  params: CheckoutParams,
): Promise<StripeCheckoutResult> {
  if (!stripe) {
    const sessionId = `mock_plink_${randomToken(12)}`
    return { sessionId, url: `${successUrl(params)}&session=${sessionId}&mock=1` }
  }
  const price = await stripe.prices.create({
    currency: 'eur',
    unit_amount: params.amountCents,
    product_data: { name: params.description },
  })
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { orderNumber: params.orderNumber },
    after_completion: { type: 'redirect', redirect: { url: successUrl(params) } },
  })
  return { sessionId: link.id, url: link.url }
}

/**
 * Verifies and parses a Stripe webhook. With a configured webhook secret the
 * signature is enforced; in mock mode the raw JSON body is trusted (dev only).
 */
export function constructStripeWebhookEvent(
  rawBody: Buffer,
  signature: string | undefined,
): Stripe.Event {
  if (stripe) {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhook secret is not configured')
    if (!signature) throw new Error('Missing stripe-signature header')
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  }
  // env validation already requires the webhook secret alongside a live key in
  // production; this guard keeps unsigned events out even if that changes.
  if (isProduction)
    throw new Error('Refusing to accept unsigned Stripe webhook event in production')
  return JSON.parse(rawBody.toString('utf8')) as Stripe.Event
}

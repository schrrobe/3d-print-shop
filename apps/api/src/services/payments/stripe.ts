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

interface CheckoutParams {
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

export async function createStripeCheckoutSession(
  params: CheckoutParams,
): Promise<StripeCheckoutResult> {
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
    success_url: successUrl(params),
    cancel_url: `${env.WEB_URL}/checkout?cancelled=1`,
  })
  return { sessionId: session.id, url: session.url ?? successUrl(params) }
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
  if (isProduction) throw new Error('Unsigned Stripe webhooks are disabled in production')
  return JSON.parse(rawBody.toString('utf8')) as Stripe.Event
}

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

/**
 * Legacy (ADR 0002: no new Stripe Payment Links are created): already-sent
 * links of a cancelled order must no longer accept payments (mock links are ignored).
 * Deactivating only blocks new sessions, so checkout pages already open are expired too.
 */
export async function deactivateStripePaymentLink(linkId: string): Promise<void> {
  if (!stripe || linkId.startsWith('mock_')) return
  await stripe.paymentLinks.update(linkId, { active: false })
  for await (const session of stripe.checkout.sessions.list({
    payment_link: linkId,
    status: 'open',
  })) {
    await stripe.checkout.sessions.expire(session.id)
  }
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

/**
 * Switching an unpaid order to PayPal: closes its open session. Returns false when
 * the session already completed (paid, webhook pending), so the switch must not happen.
 */
export async function closeStripeCheckoutSession(sessionId: string): Promise<boolean> {
  if (!stripe) return true
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.status === 'complete') return false
  if (session.status === 'open') await stripe.checkout.sessions.expire(sessionId)
  return true
}

export type StripeRefundStatus = 'pending' | 'succeeded' | 'failed'

/** Stripe refund states → ours (requires_action counts as still pending). */
export function mapStripeRefundStatus(status: string | null | undefined): StripeRefundStatus {
  if (status === 'succeeded') return 'succeeded'
  if (status === 'failed' || status === 'canceled') return 'failed'
  return 'pending'
}

/** PaymentIntent of a paid Checkout Session (legacy payments stored only the session). */
export async function stripePaymentIntentForSession(sessionId: string): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured')
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const pi =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!pi) throw new Error(`Stripe session ${sessionId} has no PaymentIntent`)
  return pi
}

/**
 * Refunds (part of) a PaymentIntent. The idempotency key (our Refund id) makes a
 * retried request return the same Stripe refund. Mock mode: instantly succeeded.
 */
export async function createStripeRefund(input: {
  paymentIntentId: string | null
  amountCents: number
  idempotencyKey: string
}): Promise<{ id: string; status: StripeRefundStatus; failureReason: string | null }> {
  if (!stripe) return { id: `mock_re_${randomToken(12)}`, status: 'succeeded', failureReason: null }
  if (!input.paymentIntentId) throw new Error('Payment has no Stripe PaymentIntent')
  const refund = await stripe.refunds.create(
    { payment_intent: input.paymentIntentId, amount: input.amountCents },
    { idempotencyKey: input.idempotencyKey },
  )
  const status = mapStripeRefundStatus(refund.status)
  return {
    id: refund.id,
    status,
    failureReason: status === 'failed' ? (refund.failure_reason ?? refund.status) : null,
  }
}

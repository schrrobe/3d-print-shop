import { env, isProduction } from '../../env.js'
import { randomToken } from '../../lib/tokens.js'
import { company } from '../company.js'

/**
 * PayPal Orders API v2 over plain fetch (ADR 0001): wallet only, intent CAPTURE,
 * redirect flow. Without PAYPAL_CLIENT_ID dev/test run a mock: `mock_pp_<cents>_*`
 * orders whose approve URL leads straight back to our return endpoint.
 */
export function isPaypalMock(): boolean {
  return !env.PAYPAL_CLIENT_ID && !isProduction
}

export function isPaypalEnabled(): boolean {
  return Boolean(env.PAYPAL_CLIENT_ID) || isPaypalMock()
}

const apiBase = () =>
  env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

export class PaypalApiError extends Error {
  constructor(
    readonly status: number,
    readonly issue: string | undefined,
    message: string,
  ) {
    super(message)
  }
}

let token: { value: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value
  const basic = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString(
    'base64',
  )
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new PaypalApiError(res.status, undefined, `PayPal OAuth failed: ${res.status}`)
  const body = (await res.json()) as { access_token: string; expires_in: number }
  // Renew a minute early so a token never expires mid-request.
  token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 }
  return token.value
}

async function paypalFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  { body, requestId }: { body?: string; requestId?: string } = {},
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(requestId ? { 'paypal-request-id': requestId } : {}),
    },
    body,
  })
  const text = await res.text()
  const data = (text ? JSON.parse(text) : {}) as T & {
    name?: string
    details?: { issue?: string }[]
  }
  if (!res.ok) {
    const issue = data.details?.[0]?.issue ?? data.name
    throw new PaypalApiError(res.status, issue, `PayPal ${method} ${path}: ${res.status} ${issue}`)
  }
  return data
}

const toValue = (cents: number) => (cents / 100).toFixed(2)
const toCents = (value: string) => Math.round(Number(value) * 100)

const PAYPAL_LOCALES: Record<string, string> = {
  de: 'de-DE',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  cs: 'cs-CZ',
}

export interface PaypalOrderParams {
  orderNumber: string
  accessToken: string
  amountCents: number
  locale: string
  description: string
}

/** PayPal sends the customer back here with `&token=<paypal order id>&PayerID=…` appended. */
function returnUrl(p: PaypalOrderParams): string {
  return `${env.WEB_URL}/api/payments/paypal/return?order=${p.orderNumber}&access=${p.accessToken}`
}

export async function createPaypalOrder(
  params: PaypalOrderParams,
): Promise<{ id: string; approveUrl: string }> {
  if (isPaypalMock()) {
    const id = `mock_pp_${params.amountCents}_${randomToken(12)}`
    return { id, approveUrl: `${returnUrl(params)}&token=${id}` }
  }
  const order = await paypalFetch<{ id: string; links?: { rel: string; href: string }[] }>(
    'POST',
    '/v2/checkout/orders',
    {
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: params.orderNumber,
            custom_id: params.orderNumber,
            description: params.description,
            amount: { currency_code: 'EUR', value: toValue(params.amountCents) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: returnUrl(params),
              cancel_url: `${env.WEB_URL}/order/${params.orderNumber}?token=${params.accessToken}&paypal=cancelled`,
              brand_name: company().name.slice(0, 127),
              locale: PAYPAL_LOCALES[params.locale] ?? 'de-DE',
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
            },
          },
        },
      }),
    },
  )
  const approveUrl = order.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href
  if (!approveUrl) throw new Error(`PayPal order ${order.id} has no approve link`)
  return { id: order.id, approveUrl }
}

export interface PaypalCapture {
  captureId: string
  /** COMPLETED, PENDING (e.g. under review), DECLINED, … */
  status: string
  amountCents: number
  currency: string
}

interface PaypalOrderResource {
  purchase_units?: {
    payments?: {
      captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[]
    }
  }[]
}

function firstCapture(order: PaypalOrderResource, paypalOrderId: string): PaypalCapture {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0]
  if (!capture) throw new Error(`PayPal order ${paypalOrderId} has no capture`)
  return {
    captureId: capture.id,
    status: capture.status,
    amountCents: toCents(capture.amount.value),
    currency: capture.amount.currency_code,
  }
}

/**
 * Captures an approved order. Idempotent: the request id makes PayPal replay a
 * concurrent capture, and an already captured order is read back instead.
 */
export async function capturePaypalOrder(paypalOrderId: string): Promise<PaypalCapture> {
  if (isPaypalMock()) {
    const cents = /^mock_pp_(\d+)_/.exec(paypalOrderId)?.[1]
    if (!cents) throw new Error(`Not a mock PayPal order: ${paypalOrderId}`)
    return {
      captureId: `mock_ppc_${paypalOrderId.slice(-16)}`,
      status: 'COMPLETED',
      amountCents: Number(cents),
      currency: 'EUR',
    }
  }
  const path = `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`
  try {
    const order = await paypalFetch<PaypalOrderResource>('POST', `${path}/capture`, {
      requestId: `capture-${paypalOrderId}`,
    })
    return firstCapture(order, paypalOrderId)
  } catch (err) {
    if (!(err instanceof PaypalApiError) || err.issue !== 'ORDER_ALREADY_CAPTURED') throw err
    return firstCapture(await paypalFetch<PaypalOrderResource>('GET', path), paypalOrderId)
  }
}

export type PaypalRefundStatus = 'pending' | 'succeeded' | 'failed'

export function mapPaypalRefundStatus(status: string | undefined): PaypalRefundStatus {
  if (status === 'COMPLETED') return 'succeeded'
  if (status === 'CANCELLED' || status === 'FAILED') return 'failed'
  return 'pending'
}

export async function refundPaypalCapture(input: {
  captureId: string
  amountCents: number
  requestId: string
}): Promise<{ id: string; status: PaypalRefundStatus; failureReason?: string | null }> {
  if (isPaypalMock()) return { id: `mock_ppr_${randomToken(12)}`, status: 'succeeded' }
  const refund = await paypalFetch<{
    id: string
    status: string
    status_details?: { reason?: string }
  }>('POST', `/v2/payments/captures/${encodeURIComponent(input.captureId)}/refund`, {
    requestId: input.requestId,
    body: JSON.stringify({ amount: { currency_code: 'EUR', value: toValue(input.amountCents) } }),
  })
  const status = mapPaypalRefundStatus(refund.status)
  return {
    id: refund.id,
    status,
    failureReason: status === 'failed' ? (refund.status_details?.reason ?? refund.status) : null,
  }
}

/**
 * Verifies a webhook via PayPal's verify-webhook-signature API. The event is
 * passed back byte-for-byte (re-serializing can break the signature). Mock mode
 * trusts the body, like the Stripe mock (never in production).
 */
export async function verifyPaypalWebhook(
  rawBody: Buffer,
  header: (name: string) => string | undefined,
): Promise<boolean> {
  if (isPaypalMock()) return true
  if (!env.PAYPAL_WEBHOOK_ID) return false
  const raw = rawBody.toString('utf8')
  JSON.parse(raw) // a single valid JSON value, so splicing it in below is safe
  const fields = {
    auth_algo: header('paypal-auth-algo'),
    cert_url: header('paypal-cert-url'),
    transmission_id: header('paypal-transmission-id'),
    transmission_sig: header('paypal-transmission-sig'),
    transmission_time: header('paypal-transmission-time'),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
  }
  if (Object.values(fields).some((v) => !v)) return false
  const body = `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${raw}}`
  const result = await paypalFetch<{ verification_status?: string }>(
    'POST',
    '/v1/notifications/verify-webhook-signature',
    { body },
  )
  return result.verification_status === 'SUCCESS'
}

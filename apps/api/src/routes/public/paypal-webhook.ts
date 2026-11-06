import { Router, raw } from 'express'
import { badRequest } from '../../middleware/error.js'
import {
  capturePaypalPayment,
  completePaypalCapture,
  denyPaypalCapture,
} from '../../services/payments/paypal-flow.js'
import { mapPaypalRefundStatus, verifyPaypalWebhook } from '../../services/payments/paypal.js'
import { syncProviderRefund } from '../../services/refunds.js'

export const paypalWebhookRouter = Router()

interface PaypalWebhookEvent {
  event_type?: string
  resource?: {
    id?: string
    status?: string
    amount?: { value?: string; currency_code?: string }
    status_details?: { reason?: string }
    links?: { rel?: string; href?: string }[]
    supplementary_data?: { related_ids?: { order_id?: string; capture_id?: string } }
  }
}

const REFUND_EVENTS = new Set([
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
  'PAYMENT.REFUND.PENDING',
  'PAYMENT.REFUND.FAILED',
])

/**
 * PayPal webhook (mounted before the JSON parser: verification needs the raw
 * bytes). Fallback when the customer never comes back from PayPal, plus refunds
 * made in the PayPal dashboard.
 */
paypalWebhookRouter.post('/', raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const rawBody = req.body as Buffer
    let event: PaypalWebhookEvent
    try {
      if (!Buffer.isBuffer(rawBody)) throw new Error('No body')
      if (!(await verifyPaypalWebhook(rawBody, (name) => req.get(name)))) throw new Error('Invalid')
      event = JSON.parse(rawBody.toString('utf8')) as PaypalWebhookEvent
    } catch {
      throw badRequest('Webhook verification failed')
    }

    const resource = event.resource ?? {}
    const type = event.event_type ?? ''
    if (type === 'CHECKOUT.ORDER.APPROVED' && resource.id) {
      await capturePaypalPayment(resource.id)
    } else if (type === 'PAYMENT.CAPTURE.COMPLETED' && resource.id && resource.amount?.value) {
      await completePaypalCapture(
        {
          captureId: resource.id,
          status: resource.status ?? 'COMPLETED',
          amountCents: Math.round(Number(resource.amount.value) * 100),
          currency: resource.amount.currency_code ?? '',
        },
        resource.supplementary_data?.related_ids?.order_id,
      )
    } else if (
      (type === 'PAYMENT.CAPTURE.DENIED' || type === 'PAYMENT.CAPTURE.DECLINED') &&
      resource.id
    ) {
      await denyPaypalCapture(resource.id)
    } else if (REFUND_EVENTS.has(type) && resource.id && resource.amount?.value) {
      const captureId =
        resource.supplementary_data?.related_ids?.capture_id ??
        resource.links
          ?.find((l) => l.rel === 'up')
          ?.href?.split('/')
          .pop()
      if (captureId) {
        const status =
          type === 'PAYMENT.REFUND.FAILED' ? 'failed' : mapPaypalRefundStatus(resource.status)
        await syncProviderRefund({
          provider: 'paypal',
          payment: { paypalCaptureId: captureId },
          providerRefundId: resource.id,
          amountCents: Math.round(Number(resource.amount.value) * 100),
          status,
          failureReason: status === 'failed' ? (resource.status_details?.reason ?? type) : null,
        })
      }
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

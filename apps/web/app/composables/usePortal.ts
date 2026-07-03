import { useState } from '#imports'

/**
 * Magic-link customer portal client. The token is only ever sent in the
 * Authorization header (never a query string), lives in memory for the session,
 * and the portal page carries noindex + no-referrer.
 */
export interface PortalOrder {
  orderNumber: string
  status: string
  totalCents: number
  carrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  items: { name: string; quantity: number; unitPriceCents: number }[]
  orderUrl: string
  accessToken: string
  invoiceAvailable: boolean
  production: { total: number; byStatus: Record<string, number> }
  complaints: { complaintNumber: string; status: string }[]
}

export interface PortalQuote {
  quoteNumber?: string
  status: string
  quoteUrl?: string
  createdAt?: string
  [key: string]: unknown
}

export interface PortalConfiguration {
  shareToken: string
  productSlug?: string
  productName?: string
  swatches?: { slot: string; name: string; hex: string; available?: boolean }[]
  [key: string]: unknown
}

export type PortalError = 'expired' | 'invalid' | 'unknown' | null

export function usePortal(token: string) {
  const authHeaders = { Authorization: `Bearer ${token}` }

  const orders = useState<PortalOrder[]>(`portal-orders-${token}`, () => [])
  const quotes = useState<PortalQuote[]>(`portal-quotes-${token}`, () => [])
  const configurations = useState<PortalConfiguration[]>(`portal-configs-${token}`, () => [])
  const email = useState<string | null>(`portal-email-${token}`, () => null)
  const loading = useState(`portal-loading-${token}`, () => false)
  const errorKind = useState<PortalError>(`portal-error-${token}`, () => null)

  function classifyError(err: unknown): PortalError {
    const code = (err as { data?: { error?: string } })?.data?.error
    if (code === 'expired_portal_token') return 'expired'
    if (code === 'invalid_portal_token') return 'invalid'
    return 'unknown'
  }

  async function load() {
    loading.value = true
    errorKind.value = null
    try {
      const [me, orderRes, quoteRes, configRes] = await Promise.all([
        $fetch<{ email: string }>('/api/portal/me', { headers: authHeaders }).catch(() => null),
        $fetch<{ orders: PortalOrder[] }>('/api/portal/orders', { headers: authHeaders }),
        $fetch<{ quoteRequests: { quotes: PortalQuote[] }[] }>('/api/portal/quotes', {
          headers: authHeaders,
        }).catch(() => ({ quoteRequests: [] })),
        $fetch<{ configurations: PortalConfiguration[] }>('/api/portal/configurations', {
          headers: authHeaders,
        }).catch(() => ({ configurations: [] })),
      ])
      email.value = me?.email ?? null
      orders.value = orderRes.orders ?? []
      // The API groups quotes under quote requests — flatten to a flat list.
      quotes.value = (quoteRes.quoteRequests ?? []).flatMap((r) => r.quotes ?? [])
      configurations.value = configRes.configurations ?? []
    } catch (err) {
      errorKind.value = classifyError(err)
    } finally {
      loading.value = false
    }
  }

  /** Invoice download must go through fetch — an <a href> cannot carry the Bearer header. */
  async function downloadInvoice(orderNumber: string) {
    const blob = await $fetch<Blob>(`/api/portal/orders/${orderNumber}/invoice.pdf`, {
      headers: authHeaders,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${orderNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { orders, quotes, configurations, email, loading, errorKind, load, downloadInvoice }
}

/** Anti-enumeration request — the server always answers 202. */
export async function requestPortalLink(input: {
  email: string
  orderNumber?: string
  locale: string
}) {
  await $fetch('/api/portal/request-link', {
    method: 'POST',
    body: {
      email: input.email,
      orderNumber: input.orderNumber || undefined,
      locale: input.locale,
    },
  })
}

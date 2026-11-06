import { UPLOAD_TERMS_VERSION } from '@print-shop/utils'
import { request, type APIRequestContext } from '@playwright/test'

export const API_URL = 'http://localhost:3001'
export const ADMIN_EMAIL = 'admin@example.com'
export const ADMIN_PASSWORD = 'admin-dev-password'

export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_URL })
}

/** API context with an authenticated admin session cookie. */
export async function adminApiContext(): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: API_URL })
  const response = await ctx.post('/api/admin/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  if (!response.ok()) throw new Error(`Admin API login failed: ${response.status()}`)
  return ctx
}

export interface SeedProduct {
  id: string
  slug: string
  priceCents: number
}

export async function getFirstProduct(): Promise<SeedProduct> {
  const ctx = await apiContext()
  const response = await ctx.get('/api/products')
  const data = (await response.json()) as { products: SeedProduct[] }
  await ctx.dispose()
  const product = data.products[0]
  if (!product) throw new Error('No seeded products found')
  return product
}

/** Creates a support ticket via the public API; returns number + public token. */
export async function createTicketViaApi(
  email = 'e2e-ticket@example.com',
  overrides: Record<string, string> = {},
): Promise<{ ticketNumber: string; accessToken: string }> {
  const ctx = await apiContext()
  const response = await ctx.post('/api/tickets', {
    data: {
      name: 'E2E Ticket Tester',
      email,
      subject: 'E2E Support-Anfrage',
      message: 'Dies ist eine automatisch erstellte Support-Anfrage aus dem E2E-Test.',
      category: 'other',
      locale: 'de',
      ...overrides,
    },
  })
  if (!response.ok()) throw new Error(`ticket create failed: ${response.status()}`)
  const data = (await response.json()) as { ticketNumber: string; accessToken: string }
  await ctx.dispose()
  return data
}

/** Creates an upload request + quote via the API; returns the public quote token. */
export async function createQuoteViaApi(email = 'e2e-quote@example.com'): Promise<{
  token: string
  priceCents: number
}> {
  const ctx = await apiContext()
  const upload = await ctx.post('/api/upload-requests', {
    multipart: {
      files: {
        name: 'e2e-model.stl',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('solid e2e\nendsolid e2e\n'),
      },
      name: 'E2E Tester',
      email,
      description: 'E2E Angebotsworkflow — bitte in PLA drucken.',
      quantity: '1',
      locale: 'de',
      acceptsUploadTerms: 'true',
      uploadTermsVersion: UPLOAD_TERMS_VERSION,
    },
  })
  if (!upload.ok()) throw new Error(`upload-request failed: ${upload.status()}`)
  const { requestId } = (await upload.json()) as { requestId: string }
  await ctx.dispose()

  const admin = await adminApiContext()
  const quote = await admin.post(`/api/admin/quote-requests/${requestId}/quotes`, {
    data: { priceCents: 12900, message: 'E2E Angebot inkl. Versand', validDays: 14 },
  })
  if (!quote.ok()) throw new Error(`quote create failed: ${quote.status()}`)
  const quoteData = (await quote.json()) as { quote: { token: string; priceCents: number } }
  await admin.dispose()
  return { token: quoteData.quote.token, priceCents: quoteData.quote.priceCents }
}

/** Checkout + mock-pay (Stripe dev) a single-item order; returns its number + token. */
export async function createPaidOrderViaApi(
  productId: string,
  email = 'e2e-flow@example.com',
): Promise<{ orderNumber: string; accessToken: string }> {
  const ctx = await apiContext()
  const checkout = await ctx.post('/api/checkout', {
    headers: { 'Idempotency-Key': `e2e-${crypto.randomUUID()}` },
    data: {
      items: [{ productId, quantity: 1, colorSelection: {} }],
      address: {
        firstName: 'Flow',
        lastName: 'Test',
        street: 'Flowweg 1',
        zip: '10115',
        city: 'Berlin',
        country: 'DE',
        email,
      },
      paymentMethod: 'stripe',
    },
  })
  if (!checkout.ok()) throw new Error(`checkout failed: ${checkout.status()}`)
  const data = (await checkout.json()) as {
    orderNumber: string
    accessToken: string
    payment: { redirectUrl: string }
  }
  const session = new URL(data.payment.redirectUrl).searchParams.get('session')!
  await ctx.post(`/api/dev/stripe/complete/${session}`)
  await ctx.dispose()
  return { orderNumber: data.orderNumber, accessToken: data.accessToken }
}

interface AdminOrderDetail {
  id: string
  orderNumber: string
  status: string
  items: { id: string; name: string; quantity: number }[]
  printerJobs: { id: string; status: string }[]
}

export async function getAdminOrder(
  admin: APIRequestContext,
  orderNumber: string,
): Promise<AdminOrderDetail> {
  const list = (await (await admin.get(`/api/admin/orders?status=paid`)).json()) as {
    orders: { id: string; orderNumber: string }[]
  }
  let match = list.orders.find((o) => o.orderNumber === orderNumber)
  if (!match) {
    // fall back to a broad scan across common statuses
    for (const status of ['in_production', 'ready_to_ship', 'shipped', 'quality_check']) {
      const res = (await (await admin.get(`/api/admin/orders?status=${status}`)).json()) as {
        orders: { id: string; orderNumber: string }[]
      }
      match = res.orders.find((o) => o.orderNumber === orderNumber)
      if (match) break
    }
  }
  if (!match) throw new Error(`order ${orderNumber} not found`)
  const detail = (await (await admin.get(`/api/admin/orders/${match.id}`)).json()) as {
    order: AdminOrderDetail
  }
  return detail.order
}

/** Drive every waiting print job of an order through production to ready_to_ship. */
export async function finishOrderJobs(
  admin: APIRequestContext,
  orderNumber: string,
): Promise<AdminOrderDetail> {
  const printers = (await (await admin.get('/api/admin/printers')).json()) as {
    printers: { id: string }[]
  }
  const printerId = printers.printers[0]?.id
  if (!printerId) throw new Error('no printer to assign')
  const order = await getAdminOrder(admin, orderNumber)
  for (const job of order.printerJobs.filter((j) => j.status === 'waiting')) {
    const assigned = await admin.post(`/api/admin/production/${job.id}/assign`, {
      data: { printerId, printDurationMinutes: 30 },
    })
    if (!assigned.ok()) throw new Error(`assign failed: ${assigned.status()}`)
    for (const status of ['printing', 'printed', 'quality_check', 'ready_to_ship']) {
      const res = await admin.post(`/api/admin/production/${job.id}/status`, { data: { status } })
      if (!res.ok()) throw new Error(`job → ${status} failed: ${res.status()}`)
    }
  }
  return getAdminOrder(admin, orderNumber)
}

/** Log in to the API as a specific seeded role account. */
export async function roleApiContext(
  email: string,
  password = 'admin-dev-password',
): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: API_URL })
  const res = await ctx.post('/api/admin/auth/login', { data: { email, password } })
  if (!res.ok()) throw new Error(`login failed for ${email}: ${res.status()}`)
  return ctx
}

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

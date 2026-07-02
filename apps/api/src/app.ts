import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { devEndpointsEnabled, env } from './env.js'
import { requireAuth } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/error.js'
import { adminAuditRouter } from './routes/admin/audit.js'
import { adminAuthRouter } from './routes/admin/auth.js'
import { adminColorsRouter } from './routes/admin/colors.js'
import { adminDashboardRouter } from './routes/admin/dashboard.js'
import { adminInvoicesRouter } from './routes/admin/invoices.js'
import { adminOrdersRouter } from './routes/admin/orders.js'
import { adminPaymentsRouter } from './routes/admin/payments.js'
import { adminPrintersRouter } from './routes/admin/printers.js'
import { adminProductionRouter } from './routes/admin/production.js'
import { adminProductsRouter } from './routes/admin/products.js'
import { adminQuoteRequestsRouter } from './routes/admin/quote-requests.js'
import { adminUsersRouter } from './routes/admin/users.js'
import { checkoutRouter } from './routes/public/checkout.js'
import { colorsRouter } from './routes/public/colors.js'
import { consentRouter } from './routes/public/consent.js'
import { devRouter } from './routes/public/dev.js'
import { ordersRouter } from './routes/public/orders.js'
import { paymentsRouter } from './routes/public/payments.js'
import { productsRouter } from './routes/public/products.js'
import { quotesRouter } from './routes/public/quotes.js'
import { uploadsRouter } from './routes/public/uploads.js'
import { webhooksRouter } from './routes/public/webhooks.js'

export function createApp(): Express {
  const app = express()

  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
    }),
  )

  // Stripe webhook needs the raw body — mount before the JSON parser.
  app.use('/api/webhooks', webhooksRouter)

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  // Public shop API
  app.use('/api/products', productsRouter)
  app.use('/api/colors', colorsRouter)
  app.use('/api/checkout', checkoutRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/upload-requests', uploadsRouter)
  app.use('/api/quotes', quotesRouter)
  app.use('/api/consent', consentRouter)
  app.use('/api/payments', paymentsRouter)

  // Admin API (session cookie + RBAC per route)
  app.use('/api/admin/auth', adminAuthRouter)
  app.use('/api/admin/dashboard', requireAuth, adminDashboardRouter)
  app.use('/api/admin/products', requireAuth, adminProductsRouter)
  app.use('/api/admin/colors', requireAuth, adminColorsRouter)
  app.use('/api/admin/quote-requests', requireAuth, adminQuoteRequestsRouter)
  app.use('/api/admin/orders', requireAuth, adminOrdersRouter)
  app.use('/api/admin/payments', requireAuth, adminPaymentsRouter)
  app.use('/api/admin/invoices', requireAuth, adminInvoicesRouter)
  app.use('/api/admin/printers', requireAuth, adminPrintersRouter)
  app.use('/api/admin/production', requireAuth, adminProductionRouter)
  app.use('/api/admin/users', requireAuth, adminUsersRouter)
  app.use('/api/admin/audit-log', requireAuth, adminAuditRouter)

  // Dev-only simulation endpoints (mock payments, email log)
  if (devEndpointsEnabled) {
    app.use('/api/dev', devRouter)
  }

  app.use((_req, _res, next) => next(notFound('Route not found')))
  app.use(errorHandler)

  return app
}

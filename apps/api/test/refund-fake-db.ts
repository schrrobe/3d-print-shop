import { vi } from 'vitest'

/**
 * In-memory stand-in for the Prisma models the refund flow touches, so
 * sums/locks/CAS behave like the database across several calls.
 */
type Row = Record<string, unknown>

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((c) => matches(row, c))
    if (cond && typeof cond === 'object' && 'in' in cond) {
      return (cond.in as unknown[]).includes(row[key])
    }
    return row[key] === cond
  })
}

function sum(rows: Row[]): number {
  return rows.reduce((s, r) => s + (r.amountCents as number), 0)
}

export const state = {
  order: {} as Row,
  payment: {} as Row,
  invoice: null as Row | null,
  refunds: [] as Row[],
  jobs: [] as Row[],
  printers: [] as Row[],
  complaints: [] as Row[],
}

let seq = 0

export function resetState(over: { order?: Row; payment?: Row; invoice?: Row | null } = {}): void {
  seq = 0
  state.order = {
    id: 'order_1',
    orderNumber: 'PS-1',
    status: 'paid',
    totalCents: 10000,
    trackingSessionId: null,
    ...over.order,
  }
  state.payment = {
    id: 'pay_1',
    orderId: 'order_1',
    method: 'stripe',
    status: 'paid',
    amountCents: 10000,
    stripePaymentIntentId: 'pi_1',
    stripeSessionId: 'cs_1',
    reference: 'cs_1',
    paypalCaptureId: null,
    ...over.payment,
  }
  state.invoice =
    over.invoice === undefined
      ? { id: 'inv_1', number: 'RE-2026-7Q3K9X', locale: 'de' }
      : over.invoice
  state.refunds = []
  state.jobs = []
  state.printers = []
  state.complaints = []
}

function withRelations(r: Row): Row {
  return {
    ...r,
    invoiceCorrection: null,
    payment: { ...state.payment, order: { ...state.order, invoice: state.invoice } },
  }
}

const refund = {
  aggregate: vi.fn(async ({ where }: { where: Row }) => ({
    _sum: { amountCents: sum(state.refunds.filter((r) => matches(r, where))) || null },
  })),
  create: vi.fn(async ({ data }: { data: Row }) => {
    if (
      data.providerRefundId &&
      state.refunds.some((r) => r.providerRefundId === data.providerRefundId)
    ) {
      const { Prisma } = await import('@prisma/client')
      throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
    }
    const row = {
      id: `ref_${++seq}`,
      providerRefundId: null,
      failureReason: null,
      reason: null,
      complaintId: null,
      createdById: null,
      createdAt: new Date(),
      ...data,
    }
    state.refunds.push(row)
    return { ...row }
  }),
  update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
    const row = state.refunds.find((r) => r.id === where.id)!
    Object.assign(row, data)
    return { ...row }
  }),
  updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
    const rows = state.refunds.filter((r) => matches(r, where))
    rows.forEach((r) => Object.assign(r, data))
    return { count: rows.length }
  }),
  findUnique: vi.fn(async ({ where }: { where: Row }) => {
    const row = state.refunds.find((r) => matches(r, where))
    return row ? { ...row } : null
  }),
  findFirst: vi.fn(async ({ where }: { where: Row }) => {
    const row = state.refunds.find((r) => matches(r, where))
    return row ? { ...row } : null
  }),
  findUniqueOrThrow: vi.fn(async ({ where, include }: { where: Row; include?: unknown }) => {
    const row = state.refunds.find((r) => matches(r, where))
    if (!row) throw new Error('not found')
    return include ? withRelations(row) : { ...row }
  }),
}

export const fakeDb = {
  refund,
  order: {
    findUnique: vi.fn(async () => ({
      ...state.order,
      invoice: state.invoice,
      payments: [
        {
          ...state.payment,
          refunds: state.refunds.map((r) => ({ ...r, invoiceCorrection: null, createdBy: null })),
        },
      ],
    })),
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      if (!matches(state.order, where)) return { count: 0 }
      Object.assign(state.order, data)
      return { count: 1 }
    }),
  },
  payment: {
    findFirst: vi.fn(async ({ where }: { where: Row }) =>
      matches(state.payment, where) ? { ...state.payment } : null,
    ),
    update: vi.fn(async ({ data }: { data: Row }) => Object.assign(state.payment, data)),
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      if (!matches(state.payment, where)) return { count: 0 }
      Object.assign(state.payment, data)
      return { count: 1 }
    }),
  },
  complaint: {
    findUnique: vi.fn(
      async ({ where }: { where: Row }) => state.complaints.find((c) => c.id === where.id) ?? null,
    ),
  },
  printerJob: {
    findMany: vi.fn(async ({ where }: { where: Row }) =>
      state.jobs.filter((j) => matches(j, where)).map((j) => ({ ...j })),
    ),
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      const rows = state.jobs.filter((j) => matches(j, where))
      rows.forEach((j) => Object.assign(j, data))
      return { count: rows.length }
    }),
  },
  printer: {
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      const rows = state.printers.filter((p) => matches(p, where))
      rows.forEach((p) => Object.assign(p, data))
      return { count: rows.length }
    }),
  },
  $queryRaw: vi.fn(async () => []),
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(fakeDb)),
}

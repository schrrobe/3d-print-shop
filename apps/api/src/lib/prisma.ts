import { PrismaClient } from '@prisma/client'

// Staff-only fields stay out of every query unless a query opts in with `omit: { field: false }`.
export const prisma = new PrismaClient({ omit: { product: { internalNote: true } } })

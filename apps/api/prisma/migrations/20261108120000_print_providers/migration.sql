-- External print providers: orders can be handed to an outside manufacturer
-- who gets the job by email and a frozen share of the goods value.
CREATE TYPE "ProviderAssignmentStatus" AS ENUM ('assigned', 'completed', 'received', 'cancelled');

CREATE TABLE "PrintProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "defaultRateBp" INTEGER NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrintProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "ProviderAssignmentStatus" NOT NULL DEFAULT 'assigned',
    "rateBp" INTEGER NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "payoutCents" INTEGER NOT NULL,
    "shareCustomerData" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "paidOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProviderAssignment_orderId_idx" ON "ProviderAssignment"("orderId");
CREATE INDEX "ProviderAssignment_providerId_createdAt_idx" ON "ProviderAssignment"("providerId", "createdAt");
-- At most one live (non-cancelled) assignment per order; not expressible in Prisma.
CREATE UNIQUE INDEX "ProviderAssignment_orderId_active_key" ON "ProviderAssignment"("orderId") WHERE "status" <> 'cancelled';

ALTER TABLE "ProviderAssignment" ADD CONSTRAINT "ProviderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderAssignment" ADD CONSTRAINT "ProviderAssignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PrintProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

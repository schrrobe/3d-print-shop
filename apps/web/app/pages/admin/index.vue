<script setup lang="ts">
import { PsCard, PsPrinterStatusCard } from '@print-shop/ui'
import { formatCents } from '@print-shop/utils'
import type { PrinterStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Dashboard {
  ordersByStatus: Record<string, number>
  revenueCents: number
  openQuoteRequests: number
  printers: { id: string; name: string; status: PrinterStatus }[]
  productionWaiting: number
}

const { data } = await useFetch<Dashboard>('/api/admin/dashboard', {
  credentials: 'include',
  server: false,
})
</script>

<template>
  <div v-if="data" class="flex flex-col gap-lg" data-testid="admin-dashboard">
    <div class="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
      <PsCard>
        <p class="text-caption text-secondary">Umsatz (bezahlt)</p>
        <p class="mt-sm text-heading-small text-brand" data-testid="dashboard-revenue">
          {{ formatCents(data.revenueCents) }}
        </p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Offene Upload-Anfragen</p>
        <p class="mt-sm text-heading-small">{{ data.openQuoteRequests }}</p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Produktionsqueue (wartet)</p>
        <p class="mt-sm text-heading-small">{{ data.productionWaiting }}</p>
      </PsCard>
      <PsCard>
        <p class="text-caption text-secondary">Bestellungen</p>
        <ul class="mt-sm text-body-regular">
          <li v-for="(count, status) in data.ordersByStatus" :key="status" class="flex justify-between">
            <span class="text-secondary">{{ status }}</span><span>{{ count }}</span>
          </li>
        </ul>
      </PsCard>
    </div>
    <div class="grid gap-lg sm:grid-cols-2">
      <PsPrinterStatusCard
        v-for="printer in data.printers"
        :key="printer.id"
        :name="printer.name"
        model=""
        :status="printer.status"
      />
    </div>
  </div>
</template>

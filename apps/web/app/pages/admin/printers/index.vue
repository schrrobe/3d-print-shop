<script setup lang="ts">
import { PsButton, PsCard, PsDialog, PsInput, PsPrinterStatusCard, PsSelect } from '@print-shop/ui'
import { PRINTER_STATUSES, type PrinterStatus } from '@print-shop/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface AdminPrinter {
  id: string
  name: string
  model: string
  status: PrinterStatus
  notes: string | null
  spools: { id: string; amsSlot: number | null; material: string; remainingGrams: number | null; color: { name: string; hex: string } | null }[]
  jobs: { id: string; order: { orderNumber: string } }[]
}

const auth = useAdminAuthStore()
const { data, refresh } = await useFetch<{ printers: AdminPrinter[] }>('/api/admin/printers', {
  credentials: 'include',
  server: false,
})

const dialogOpen = ref(false)
const form = reactive({ name: '', model: '', notes: '' })
const { run } = useAdminAction({ refresh })

async function createPrinter() {
  const ok = await run(
    () =>
      $fetch('/api/admin/printers', {
        method: 'POST',
        credentials: 'include',
        body: { name: form.name, model: form.model, notes: form.notes || undefined },
      }),
    { success: 'Drucker angelegt', error: 'Anlegen fehlgeschlagen' },
  )
  if (ok) dialogOpen.value = false
}

function setStatus(printer: AdminPrinter, status: string) {
  return run(() =>
    $fetch(`/api/admin/printers/${printer.id}/status`, {
      method: 'POST',
      credentials: 'include',
      body: { status },
    }),
  )
}

const statusOptions = PRINTER_STATUSES.map((s) => ({ value: s, label: s }))
</script>

<template>
  <div data-testid="admin-printers">
    <div v-if="auth.can('printers:write')" class="mb-lg">
      <PsButton data-testid="new-printer" @click="dialogOpen = true">Drucker anlegen</PsButton>
    </div>

    <div class="grid gap-lg lg:grid-cols-2">
      <PsCard v-for="printer in data?.printers ?? []" :key="printer.id" data-testid="printer-row">
        <PsPrinterStatusCard
          :name="printer.name"
          :model="printer.model"
          :status="printer.status"
          :notes="printer.notes"
          class="border-0 !p-0 shadow-none"
        />
        <div v-if="printer.spools.length" class="mt-md border-t border-subtle pt-md">
          <p class="text-caption text-secondary">AMS-/Spulenbelegung</p>
          <ul class="mt-sm flex flex-col gap-xs text-body-regular">
            <li v-for="spool in printer.spools" :key="spool.id" class="flex items-center gap-sm">
              <span
                v-if="spool.color"
                class="inline-block size-3 rounded-full-pill border border-subtle"
                :style="{ backgroundColor: spool.color.hex }"
              />
              Slot {{ spool.amsSlot ?? '—' }}: {{ spool.color?.name ?? spool.material }}
              <span class="text-secondary">({{ spool.remainingGrams ?? '?' }} g)</span>
            </li>
          </ul>
        </div>
        <div v-if="auth.can('printers:write')" class="mt-md border-t border-subtle pt-md">
          <PsSelect
            :model-value="printer.status"
            label="Status setzen"
            :options="statusOptions"
            data-testid="printer-status-select"
            @update:model-value="(value: string | undefined) => value && setStatus(printer, value)"
          />
        </div>
      </PsCard>
    </div>

    <PsDialog v-model:open="dialogOpen" title="Drucker anlegen">
      <form class="flex flex-col gap-md" data-testid="printer-form" @submit.prevent="createPrinter">
        <PsInput v-model="form.name" label="Name" required placeholder="Bambu Lab X1C #3" />
        <PsInput v-model="form.model" label="Modell" required placeholder="Bambu Lab X1 Carbon + AMS 2 Pro" />
        <PsInput v-model="form.notes" label="Notizen" />
        <PsButton type="submit" data-testid="save-printer">Anlegen</PsButton>
      </form>
    </PsDialog>
  </div>
</template>

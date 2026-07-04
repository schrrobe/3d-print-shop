<script setup lang="ts">
import PsCard from './PsCard.vue'

export interface PackingListRecipient {
  name: string
  street: string
  zipCity: string
  country?: string
}

export interface PackingListItem {
  quantity: number
  name: string
  colorLabel?: string | null
}

/**
 * Vorschau einer Packliste in Dokument-Optik. Rein Anzeige –
 * das eigentliche PDF erzeugt der Server.
 */
withDefaults(
  defineProps<{
    shipmentNumber: string
    orderNumber: string
    recipient: PackingListRecipient
    items: PackingListItem[]
    carrierLabel?: string | null
    trackingNumber?: string | null
    notes?: string | null
  }>(),
  { carrierLabel: null, trackingNumber: null, notes: null },
)
</script>

<template>
  <PsCard data-testid="packing-list-preview">
    <div class="flex flex-col gap-md font-mono text-body-regular text-primary">
      <!-- Kopf -->
      <div class="flex items-start justify-between gap-md border-b border-subtle pb-md">
        <div class="flex flex-col">
          <span class="text-label-medium uppercase">Packliste</span>
          <span class="text-caption text-secondary">Sendung {{ shipmentNumber }}</span>
          <span class="text-caption text-secondary">Bestellung {{ orderNumber }}</span>
        </div>
        <div class="flex flex-col text-right">
          <span class="text-caption uppercase text-secondary">Empfänger</span>
          <span>{{ recipient.name }}</span>
          <span>{{ recipient.street }}</span>
          <span>{{ recipient.zipCity }}</span>
          <span v-if="recipient.country">{{ recipient.country }}</span>
        </div>
      </div>

      <!-- Positionen -->
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-subtle text-left text-caption uppercase text-secondary">
            <th scope="col" class="py-xs pr-md">Menge</th>
            <th scope="col" class="py-xs">Artikel</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="index"
            class="border-b border-subtle align-top"
            data-testid="packing-list-item"
          >
            <td class="py-xs pr-md whitespace-nowrap">{{ item.quantity }}×</td>
            <td class="py-xs">
              <span class="block">{{ item.name }}</span>
              <span v-if="item.colorLabel" class="block text-caption text-secondary">
                Farbe: {{ item.colorLabel }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Fuß -->
      <div
        v-if="carrierLabel || trackingNumber || notes"
        class="flex flex-col gap-xs text-caption text-secondary"
      >
        <p v-if="carrierLabel">Versand: {{ carrierLabel }}</p>
        <p v-if="trackingNumber">Sendungsverfolgung: {{ trackingNumber }}</p>
        <p v-if="notes" data-testid="packing-list-notes">Notizen: {{ notes }}</p>
      </div>
    </div>
  </PsCard>
</template>

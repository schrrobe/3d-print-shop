import { AMS_SLOT_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAmsSlotCard from './PsAmsSlotCard.vue'

const meta: Meta<typeof PsAmsSlotCard> = {
  title: 'Admin/AmsSlotCard',
  component: PsAmsSlotCard,
  args: {
    slotIndex: 1,
    status: 'loaded',
    spoolLabel: 'Spule #12 · Bambu Lab PLA Matt',
    colorName: 'Schwarz',
    colorHex: '#1a1a1a',
    remainingGrams: 540,
  },
  argTypes: {
    status: { control: 'select', options: [...AMS_SLOT_STATUSES] },
  },
  render: (args) => ({
    components: { PsAmsSlotCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[16rem]"><PsAmsSlotCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsAmsSlotCard>

export const Geladen: Story = {}
export const Leer: Story = {
  args: {
    status: 'empty',
    spoolLabel: null,
    colorName: null,
    colorHex: null,
    remainingGrams: null,
  },
}
export const FastLeer: Story = {
  args: {
    slotIndex: 3,
    status: 'low',
    colorName: 'Brandgrün',
    colorHex: '#31a871',
    remainingGrams: 45,
  },
}
export const Fehler: Story = {
  args: {
    slotIndex: 2,
    status: 'error',
    notes: 'Filamentsensor meldet Verstopfung — Slot prüfen.',
  },
}
export const Deaktiviert: Story = {
  args: {
    slotIndex: 4,
    status: 'disabled',
    spoolLabel: null,
    colorName: null,
    colorHex: null,
    remainingGrams: null,
    notes: 'Slot wegen defekter Führung deaktiviert.',
  },
}
export const Grid: Story = {
  render: () => ({
    components: { PsAmsSlotCard },
    template: `
      <div class="grid max-w-[48rem] grid-cols-2 gap-md sm:grid-cols-4">
        <PsAmsSlotCard :slot-index="1" status="loaded" spool-label="Spule #12" color-name="Schwarz" color-hex="#1a1a1a" :remaining-grams="540" />
        <PsAmsSlotCard :slot-index="2" status="low" spool-label="Spule #05" color-name="Brandgrün" color-hex="#31a871" :remaining-grams="45" />
        <PsAmsSlotCard :slot-index="3" status="empty" />
        <PsAmsSlotCard :slot-index="4" status="error" notes="Sensorfehler" />
      </div>
    `,
  }),
}

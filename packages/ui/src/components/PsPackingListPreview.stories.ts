import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsPackingListPreview from './PsPackingListPreview.vue'

const ITEMS = [
  { quantity: 2, name: 'Halterung v2', colorLabel: 'PLA Schwarz' },
  { quantity: 1, name: 'Gehäuse-Deckel', colorLabel: 'PETG Grau' },
  { quantity: 4, name: 'Zahnrad Modul 1.5', colorLabel: 'PLA Orange' },
  { quantity: 10, name: 'Ersatzteil Clip', colorLabel: 'ABS Weiß' },
]

const meta: Meta<typeof PsPackingListPreview> = {
  title: 'Admin/PackingListPreview',
  component: PsPackingListPreview,
  args: {
    shipmentNumber: 'S-2026-0087',
    orderNumber: '#1042',
    recipient: {
      name: 'Max Mustermann',
      street: 'Musterstraße 12',
      zipCity: '10115 Berlin',
      country: 'Deutschland',
    },
    items: ITEMS,
    carrierLabel: 'DHL Paket',
    trackingNumber: '00340434161094000001',
  },
  render: (args) => ({
    components: { PsPackingListPreview },
    setup: () => ({ args }),
    template: '<div class="max-w-2xl"><PsPackingListPreview v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsPackingListPreview>

export const Default: Story = {}

export const OhneTracking: Story = {
  args: { carrierLabel: null, trackingNumber: null },
}

export const MitNotizen: Story = {
  args: {
    notes: 'Bitte bruchsicher verpacken – Zahnräder einzeln in Tüten.',
  },
}

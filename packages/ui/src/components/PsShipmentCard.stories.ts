import { SHIPMENT_STATUSES } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsButton from './PsButton.vue'
import PsShipmentCard from './PsShipmentCard.vue'

const meta: Meta<typeof PsShipmentCard> = {
  title: 'Admin/ShipmentCard',
  component: PsShipmentCard,
  args: {
    shipmentNumber: 'VS-2026-0034',
    orderNumber: 'PS-2026-0142',
    status: 'ready_for_shipping',
    carrierLabel: 'DHL Paket',
    trackingNumber: null,
    itemSummary: '3 Positionen · 5 Stück',
    dateLabel: '30.06.2026',
  },
  argTypes: {
    status: { control: 'select', options: [...SHIPMENT_STATUSES] },
  },
  render: (args) => ({
    components: { PsShipmentCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[36rem]"><PsShipmentCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsShipmentCard>

export const Default: Story = {}

export const WithTracking: Story = {
  args: {
    status: 'shipped',
    trackingNumber: '00340434161094042557',
  },
}

export const Problem: Story = {
  args: {
    status: 'problem',
    carrierLabel: 'DPD',
    trackingNumber: '01345678901234',
    dateLabel: '25.06.2026',
  },
}

export const WithActions: Story = {
  args: { status: 'packed' },
  render: (args) => ({
    components: { PsShipmentCard, PsButton },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[36rem]">
        <PsShipmentCard v-bind="args">
          <template #actions>
            <PsButton size="sm" variant="secondary">Label drucken</PsButton>
            <PsButton size="sm">Als versendet markieren</PsButton>
          </template>
        </PsShipmentCard>
      </div>
    `,
  }),
}

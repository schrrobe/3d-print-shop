import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsCheckoutSummary from './PsCheckoutSummary.vue'

const items = [
  { name: 'Modularer Schreibtisch-Organizer', quantity: 1, unitPriceCents: 2490 },
  { name: 'Kabel-Organizer 6er-Set', quantity: 2, unitPriceCents: 1290 },
]

const meta: Meta<typeof PsCheckoutSummary> = {
  title: 'Shop/CheckoutSummary',
  component: PsCheckoutSummary,
  args: {
    items,
    subtotalCents: 5070,
    shippingCents: 490,
    totalCents: 5560,
  },
  render: (args) => ({
    components: { PsCheckoutSummary },
    setup: () => ({ args }),
    template: '<div class="max-w-[28rem]"><PsCheckoutSummary v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsCheckoutSummary>

export const Default: Story = {}
export const FreeShipping: Story = {
  args: {
    subtotalCents: 5070,
    shippingCents: 0,
    totalCents: 5070,
    freeShippingApplied: true,
  },
}
export const CustomShippingLabel: Story = {
  args: {
    shippingCents: 0,
    totalCents: 5070,
    freeShippingApplied: true,
  },
  render: (args) => ({
    components: { PsCheckoutSummary },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[28rem]">
        <PsCheckoutSummary v-bind="args">
          <template #shipping-label>Gratisversand 🎉</template>
        </PsCheckoutSummary>
      </div>
    `,
  }),
}

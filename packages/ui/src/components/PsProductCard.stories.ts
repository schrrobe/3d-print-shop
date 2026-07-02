import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsProductCard from './PsProductCard.vue'
import PsProductGrid from './PsProductGrid.vue'

const meta: Meta<typeof PsProductCard> = {
  title: 'Shop/ProductCard',
  component: PsProductCard,
  args: {
    name: 'Modularer Schreibtisch-Organizer',
    priceCents: 2490,
  },
  render: (args) => ({
    components: { PsProductCard },
    setup: () => ({ args }),
    template: '<div class="max-w-xs"><PsProductCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsProductCard>

export const Default: Story = {}
export const WithBadgeAndLink: Story = {
  args: { badge: 'Bestseller', href: '#organizer' },
}
export const InGrid: Story = {
  render: () => ({
    components: { PsProductCard, PsProductGrid },
    template: `
      <PsProductGrid>
        <PsProductCard name="Vasenmodus-Übertopf" :price-cents="1890" badge="Neu" href="#" />
        <PsProductCard name="Kabel-Organizer 6er-Set" :price-cents="1290" href="#" />
        <PsProductCard name="Wandhalterung für Kopfhörer" :price-cents="1590" badge="Bestseller" href="#" />
      </PsProductGrid>
    `,
  }),
}

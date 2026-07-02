import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsProductCard from './PsProductCard.vue'
import PsProductGrid from './PsProductGrid.vue'

const meta: Meta<typeof PsProductGrid> = {
  title: 'Shop/ProductGrid',
  component: PsProductGrid,
  render: () => ({
    components: { PsProductGrid, PsProductCard },
    template: `
      <PsProductGrid>
        <PsProductCard name="Vasenmodus-Übertopf" :price-cents="1890" badge="Neu" />
        <PsProductCard name="Kabel-Organizer 6er-Set" :price-cents="1290" />
        <PsProductCard name="Wandhalterung für Kopfhörer" :price-cents="1590" />
        <PsProductCard name="Schlüsselbrett Alpenpanorama" :price-cents="2990" badge="Bestseller" />
        <PsProductCard name="Pflanzenschild 10er-Set" :price-cents="890" />
        <PsProductCard name="Ersatzknopf-Set Waschmaschine" :price-cents="690" />
      </PsProductGrid>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsProductGrid>

export const Default: Story = {}

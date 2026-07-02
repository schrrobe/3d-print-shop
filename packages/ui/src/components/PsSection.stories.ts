import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsProductCard from './PsProductCard.vue'
import PsProductGrid from './PsProductGrid.vue'
import PsSection from './PsSection.vue'

const meta: Meta<typeof PsSection> = {
  title: 'Layout/Section',
  component: PsSection,
  args: {
    title: 'Beliebte Produkte',
    subtitle: 'Unsere meistgedruckten Modelle — jedes Stück wird frisch für dich produziert.',
    tight: false,
  },
  render: (args) => ({
    components: { PsSection, PsProductGrid, PsProductCard },
    setup: () => ({ args }),
    template: `
      <PsSection v-bind="args">
        <PsProductGrid>
          <PsProductCard name="Vasenmodus-Übertopf" :price-cents="1890" badge="Neu" />
          <PsProductCard name="Kabel-Organizer 6er-Set" :price-cents="1290" />
          <PsProductCard name="Wandhalterung für Kopfhörer" :price-cents="1590" />
        </PsProductGrid>
      </PsSection>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsSection>

export const Default: Story = {}
export const Tight: Story = { args: { tight: true } }
export const WithoutHeading: Story = {
  args: { title: undefined, subtitle: undefined },
}

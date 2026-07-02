import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsHeroSection from './PsHeroSection.vue'
import PsPillButton from './PsPillButton.vue'
import PsProductCard from './PsProductCard.vue'

const meta: Meta<typeof PsHeroSection> = {
  title: 'Layout/HeroSection',
  component: PsHeroSection,
  args: {
    eyebrow: '3D-Druck aus Berlin',
    title: 'Dein Design. Frisch gedruckt.',
    subtitle:
      'Konfiguriere Farben und Materialien, lade dein eigenes Modell hoch — wir drucken auf Bestellung und liefern in wenigen Tagen.',
  },
  render: (args) => ({
    components: { PsHeroSection, PsPillButton },
    setup: () => ({ args }),
    template: `
      <PsHeroSection v-bind="args">
        <template #actions>
          <PsPillButton size="lg">Jetzt konfigurieren</PsPillButton>
          <PsPillButton size="lg" variant="secondary">Produkte entdecken</PsPillButton>
        </template>
      </PsHeroSection>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsHeroSection>

export const Default: Story = {}
export const WithMedia: Story = {
  render: (args) => ({
    components: { PsHeroSection, PsPillButton, PsProductCard },
    setup: () => ({ args }),
    template: `
      <PsHeroSection v-bind="args">
        <template #actions>
          <PsPillButton size="lg">Jetzt konfigurieren</PsPillButton>
        </template>
        <template #media>
          <div class="mx-auto max-w-[24rem]">
            <PsProductCard name="Modularer Schreibtisch-Organizer" :price-cents="2490" badge="Bestseller" />
          </div>
        </template>
      </PsHeroSection>
    `,
  }),
}

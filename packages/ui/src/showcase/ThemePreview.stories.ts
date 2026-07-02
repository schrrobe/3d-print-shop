import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsBadge from '../components/PsBadge.vue'
import PsButton from '../components/PsButton.vue'
import PsPillButton from '../components/PsPillButton.vue'
import PsProductCard from '../components/PsProductCard.vue'

const miniPage = `
  <div class="flex flex-col gap-lg p-lg">
    <div class="flex flex-col items-start gap-md">
      <PsBadge variant="brand">3D-Druck aus Berlin</PsBadge>
      <h2 class="text-heading-small text-primary">Dein Design. Frisch gedruckt.</h2>
      <p class="text-body-regular text-secondary">
        Konfiguriere Farben und Materialien — wir drucken auf Bestellung.
      </p>
      <div class="flex flex-wrap gap-sm">
        <PsPillButton>Jetzt konfigurieren</PsPillButton>
        <PsPillButton variant="secondary">Mehr erfahren</PsPillButton>
      </div>
    </div>
    <div class="max-w-xs">
      <PsProductCard name="Schreibtisch-Organizer" :price-cents="2490" badge="Bestseller" />
    </div>
    <div class="flex flex-wrap gap-sm">
      <PsButton size="sm">Primär</PsButton>
      <PsButton size="sm" variant="secondary">Sekundär</PsButton>
      <PsBadge variant="warning">Wenig Lager</PsBadge>
      <PsBadge variant="info">In Produktion</PsBadge>
    </div>
  </div>
`

const meta: Meta = {
  title: 'Showcase/Theme Preview',
  render: () => ({
    components: { PsBadge, PsButton, PsPillButton, PsProductCard },
    template: `
      <div class="grid gap-lg lg:grid-cols-2">
        <div data-theme="dark" class="dark overflow-hidden rounded-card border border-subtle bg-surface">
          <p class="border-b border-subtle px-lg py-sm text-caption text-secondary">Dark (Brand)</p>
          ${miniPage}
        </div>
        <div data-theme="light" class="light overflow-hidden rounded-card border border-subtle bg-surface">
          <p class="border-b border-subtle px-lg py-sm text-caption text-secondary">Light (Warm)</p>
          ${miniPage}
        </div>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj

export const DarkAndLight: Story = {}

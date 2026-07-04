import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPostEditor from './PsSocialPostEditor.vue'
import { placeholderImage } from './social-story-fixtures.js'

const products = [
  {
    id: 'prod-1',
    slug: 'spiral-vase',
    name: 'Spiralvase',
    description: 'Elegante Spiralvase im Vasenmodus gedruckt — wasserdicht versiegelt.',
    priceCents: 2499,
    images: [
      { url: placeholderImage('#31a871', 'Vase 1'), alt: 'Spiralvase' },
      { url: placeholderImage('#171717', 'Vase 2'), alt: 'Spiralvase dunkel' },
    ],
  },
  {
    id: 'prod-2',
    slug: 'desk-organizer',
    name: 'Schreibtisch-Organizer',
    description: 'Modularer Organizer für Stifte, Notizen und Kleinkram.',
    priceCents: 3999,
    images: [{ url: placeholderImage('#1f6fb2', 'Organizer'), alt: 'Organizer' }],
  },
]

const meta: Meta<typeof PsSocialPostEditor> = {
  title: 'Social/SocialPostEditor',
  component: PsSocialPostEditor,
  args: { products, siteUrl: 'https://example.com' },
  render: (args) => ({
    components: { PsSocialPostEditor },
    setup: () => ({ args }),
    template: '<PsSocialPostEditor v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPostEditor>

export const NeuerPost: Story = {}
export const EntwurfBearbeiten: Story = {
  args: {
    mode: 'edit',
    initial: {
      platforms: ['instagram'],
      caption: 'Spiralvase — frisch vom Drucker! 🌿',
      mediaUrls: [products[0]!.images[0]!.url],
      productId: 'prod-1',
      scheduledAt: null,
    },
  },
}
export const GeplanterPost: Story = {
  args: {
    mode: 'edit',
    initial: {
      platforms: ['facebook'],
      caption: 'Ordnung auf dem Schreibtisch!',
      mediaUrls: [products[1]!.images[0]!.url],
      productId: 'prod-2',
      scheduledAt: '2026-07-15T10:00:00.000Z',
    },
  },
}
export const Fehlerzustand: Story = {
  args: { error: 'Speichern fehlgeschlagen — bitte erneut versuchen.' },
}
export const OhneProdukte: Story = { args: { products: [] } }
export const Light: Story = { globals: { theme: 'light' } }

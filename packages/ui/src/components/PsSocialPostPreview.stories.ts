import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPostPreview from './PsSocialPostPreview.vue'
import { placeholderImage } from './social-story-fixtures.js'

const meta: Meta<typeof PsSocialPostPreview> = {
  title: 'Social/SocialPostPreview',
  component: PsSocialPostPreview,
  args: {
    platforms: ['instagram'],
    caption: 'Spiralvase — frisch vom Drucker! 🌿\n\nJetzt im Shop.',
    mediaUrls: [placeholderImage('#31a871', 'Vase')],
    productName: 'Spiralvase',
    productUrl: 'https://example.com/products/spiral-vase',
    scheduledAt: '2026-07-15T10:00:00.000Z',
    status: 'scheduled',
  },
  render: (args) => ({
    components: { PsSocialPostPreview },
    setup: () => ({ args }),
    template: '<PsSocialPostPreview v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPostPreview>

export const GeplantInstagram: Story = {}
export const BeidePlattformen: Story = { args: { platforms: ['instagram', 'facebook'] } }
export const EntwurfOhneBild: Story = {
  args: { platforms: ['facebook'], mediaUrls: [], status: 'draft', scheduledAt: null },
}
export const Fehlgeschlagen: Story = { args: { status: 'failed' } }
export const Veroeffentlicht: Story = { args: { status: 'published' } }
export const Light: Story = { globals: { theme: 'light' } }

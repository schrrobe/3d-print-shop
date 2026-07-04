import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsProductGallery from './PsProductGallery.vue'
import { placeholderImage } from './social-story-fixtures.js'

const meta: Meta<typeof PsProductGallery> = {
  title: 'Shop/ProductGallery',
  component: PsProductGallery,
  args: {
    images: [
      { url: placeholderImage('#31a871', 'Foto 1'), alt: 'Vase von vorne' },
      { url: placeholderImage('#1f6fb2', 'Foto 2'), alt: 'Vase von der Seite' },
      { url: placeholderImage('#d23f31', 'Foto 3'), alt: 'Detailaufnahme' },
    ],
  },
  render: (args) => ({
    components: { PsProductGallery },
    setup: () => ({ args }),
    template: '<div class="max-w-[28rem]"><PsProductGallery v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsProductGallery>

export const Default: Story = {}

export const SingleImage: Story = {
  args: { images: [{ url: placeholderImage('#31a871', 'Foto'), alt: 'Produktfoto' }] },
}

export const VierBilder: Story = {
  args: {
    images: Array.from({ length: 4 }, (_, index) => ({
      url: placeholderImage(index % 2 === 0 ? '#31a871' : '#5e5e5e', `Foto ${index + 1}`),
      alt: `Produktfoto ${index + 1}`,
    })),
  },
}

export const Leer: Story = {
  args: { images: [], placeholderLabel: 'Kein Foto vorhanden' },
}

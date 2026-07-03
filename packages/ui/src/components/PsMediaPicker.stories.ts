import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsMediaPicker from './PsMediaPicker.vue'
import { placeholderImage } from './social-story-fixtures.js'

const options = [
  { url: placeholderImage('#31a871', 'Bild 1'), alt: 'Produktbild 1' },
  { url: placeholderImage('#1f6fb2', 'Bild 2'), alt: 'Produktbild 2' },
  { url: placeholderImage('#d23f31', 'Bild 3'), alt: 'Produktbild 3' },
]

const meta: Meta<typeof PsMediaPicker> = {
  title: 'Social/MediaPicker',
  component: PsMediaPicker,
  args: { options, label: 'Medien', allowUpload: true },
  render: (args) => ({
    components: { PsMediaPicker },
    setup: () => {
      const selected = ref<string[]>([options[0]!.url])
      return { args, selected }
    },
    template: '<div class="max-w-96"><PsMediaPicker v-bind="args" v-model="selected" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsMediaPicker>

export const MitAuswahl: Story = {}
export const OhneUpload: Story = { args: { allowUpload: false } }
export const LeererZustand: Story = { args: { options: [] } }
export const Fehlerzustand: Story = { args: { error: 'Upload fehlgeschlagen — nur JPG/PNG/WebP.' } }
export const Light: Story = { globals: { theme: 'light' } }

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAttachmentGallery from './PsAttachmentGallery.vue'
import { placeholderImage } from './social-story-fixtures.js'

const meta: Meta<typeof PsAttachmentGallery> = {
  title: 'Admin/AttachmentGallery',
  component: PsAttachmentGallery,
  args: {
    attachments: [
      {
        id: 'a1',
        url: placeholderImage('#31a871', 'Foto 1'),
        name: 'schaden-vorne.jpg',
        sizeLabel: '1,2 MB',
      },
      {
        id: 'a2',
        url: placeholderImage('#1f6fb2', 'Foto 2'),
        name: 'schaden-unterseite.jpg',
        sizeLabel: '840 KB',
      },
      {
        id: 'a3',
        url: placeholderImage('#d23f31', 'Foto 3'),
        name: 'verpackung.jpg',
        sizeLabel: '2,1 MB',
      },
    ],
  },
  render: (args) => ({
    components: { PsAttachmentGallery },
    setup: () => ({ args }),
    template: '<div class="max-w-[36rem]"><PsAttachmentGallery v-bind="args" @select="onSelect" /></div>',
    methods: {
      onSelect(id: string) {
        console.info('select', id)
      },
    },
  }),
}
export default meta
type Story = StoryObj<typeof PsAttachmentGallery>

export const Default: Story = {}

export const Empty: Story = {
  args: { attachments: [] },
}

export const VieleBilder: Story = {
  args: {
    attachments: Array.from({ length: 9 }, (_, index) => ({
      id: `a${index + 1}`,
      url: placeholderImage(index % 2 === 0 ? '#31a871' : '#5e5e5e', `Foto ${index + 1}`),
      name: `reklamation-${index + 1}.jpg`,
    })),
  },
}

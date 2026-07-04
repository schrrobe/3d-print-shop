import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsWishlistButton from './PsWishlistButton.vue'

const meta: Meta<typeof PsWishlistButton> = {
  title: 'Shop/WishlistButton',
  component: PsWishlistButton,
  args: {
    active: false,
    labelAdd: 'Zur Wunschliste hinzufügen',
    labelRemove: 'Von der Wunschliste entfernen',
  },
  render: (args) => ({
    components: { PsWishlistButton },
    setup: () => ({ args }),
    template: '<PsWishlistButton v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsWishlistButton>

export const Inaktiv: Story = {}

export const Aktiv: Story = { args: { active: true } }

export const Klein: Story = { args: { size: 'sm' } }

export const Interaktiv: Story = {
  render: (args) => ({
    components: { PsWishlistButton },
    setup: () => {
      const active = ref(false)
      return { args, active }
    },
    template: `
      <div class="flex items-center gap-sm">
        <PsWishlistButton
          :active="active"
          :label-add="args.labelAdd"
          :label-remove="args.labelRemove"
          @toggle="active = !active"
        />
        <span class="text-caption text-secondary">{{ active ? 'Auf der Wunschliste' : 'Nicht auf der Wunschliste' }}</span>
      </div>
    `,
  }),
}

import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsQcChecklist from './PsQcChecklist.vue'

const EMPTY_CHECKS = {
  colorOk: false,
  surfaceOk: false,
  dimensionsOk: false,
  stabilityOk: false,
  completenessOk: false,
  packagingOk: false,
}

const meta: Meta<typeof PsQcChecklist> = {
  title: 'Admin/QcChecklist',
  component: PsQcChecklist,
  args: { modelValue: { ...EMPTY_CHECKS }, disabled: false },
  render: (args) => ({
    components: { PsQcChecklist },
    setup: () => {
      const model = ref({ ...args.modelValue })
      return { args, model }
    },
    template:
      '<div class="max-w-[24rem]"><PsQcChecklist v-model="model" :disabled="args.disabled" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsQcChecklist>

export const Default: Story = {}
export const Teilweise: Story = {
  args: {
    modelValue: { ...EMPTY_CHECKS, colorOk: true, surfaceOk: true, dimensionsOk: true },
  },
}
export const Komplett: Story = {
  args: {
    modelValue: {
      colorOk: true,
      surfaceOk: true,
      dimensionsOk: true,
      stabilityOk: true,
      completenessOk: true,
      packagingOk: true,
    },
  },
}
export const Disabled: Story = {
  args: {
    modelValue: { ...EMPTY_CHECKS, colorOk: true, surfaceOk: true },
    disabled: true,
  },
}

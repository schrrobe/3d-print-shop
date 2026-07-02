import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsFileUpload from './PsFileUpload.vue'

const meta: Meta<typeof PsFileUpload> = {
  title: 'Shop/FileUpload',
  component: PsFileUpload,
  args: { accept: '.stl,.3mf', multiple: false },
  render: (args) => ({
    components: { PsFileUpload },
    setup: () => {
      const fileNames = ref<string[]>([])
      return { args, fileNames }
    },
    template: `
      <div class="flex max-w-[28rem] flex-col gap-md">
        <PsFileUpload v-bind="args" @files="(files) => (fileNames = files.map((f) => f.name))">
          3D-Modell auswählen
        </PsFileUpload>
        <span class="text-caption text-secondary">Emittiert: {{ fileNames }}</span>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsFileUpload>

export const Default: Story = {}
export const Multiple: Story = { args: { multiple: true } }

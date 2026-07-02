import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsUploadDropzone from './PsUploadDropzone.vue'

const meta: Meta<typeof PsUploadDropzone> = {
  title: 'Shop/UploadDropzone',
  component: PsUploadDropzone,
  args: { accept: '.stl,.3mf', multiple: true, maxSizeBytes: 52428800 },
  render: (args) => ({
    components: { PsUploadDropzone },
    setup: () => {
      const accepted = ref<string[]>([])
      const errorMessage = ref('')
      return { args, accepted, errorMessage }
    },
    template: `
      <div class="flex max-w-lg flex-col gap-md">
        <PsUploadDropzone
          v-bind="args"
          @files="(files) => (accepted = files.map((f) => f.name))"
          @error="(message) => (errorMessage = message)"
        />
        <span v-if="accepted.length" class="text-caption text-brand">Akzeptiert: {{ accepted.join(', ') }}</span>
        <span v-if="errorMessage" class="text-caption text-red-500">{{ errorMessage }}</span>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj<typeof PsUploadDropzone>

export const Default: Story = {}
export const SmallLimit: Story = {
  args: { maxSizeBytes: 1048576 },
}
export const CustomLabel: Story = {
  render: (args) => ({
    components: { PsUploadDropzone },
    setup: () => ({ args }),
    template: `
      <div class="max-w-lg">
        <PsUploadDropzone v-bind="args">STL oder 3MF hier ablegen</PsUploadDropzone>
      </div>
    `,
  }),
}

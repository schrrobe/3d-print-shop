import type { Meta, StoryObj } from '@storybook/vue3-vite'

const spacing = [
  { name: 'xs', px: 4, cls: 'w-xs' },
  { name: 'sm', px: 8, cls: 'w-sm' },
  { name: 'md-sm', px: 10, cls: 'w-md-sm' },
  { name: 'md', px: 16, cls: 'w-md' },
  { name: 'md-lg', px: 18, cls: 'w-md-lg' },
  { name: 'lg', px: 24, cls: 'w-lg' },
  { name: 'xl', px: 32, cls: 'w-xl' },
  { name: '2xl', px: 40, cls: 'w-2xl' },
  { name: '3xl', px: 56, cls: 'w-3xl' },
  { name: '4xl', px: 64, cls: 'w-4xl' },
  { name: '5xl', px: 80, cls: 'w-5xl' },
  { name: '6xl', px: 120, cls: 'w-6xl' },
]

const meta: Meta = {
  title: 'Showcase/Spacing',
  render: () => ({
    setup: () => ({ spacing }),
    template: `
      <div class="flex flex-col gap-sm">
        <div v-for="entry in spacing" :key="entry.name" class="flex items-center gap-md">
          <span class="w-16 text-caption text-secondary">{{ entry.name }}</span>
          <span class="w-16 text-caption text-secondary">{{ entry.px }}px</span>
          <div class="h-md rounded-card bg-brand" :class="entry.cls"></div>
        </div>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj

export const Scale: Story = {}

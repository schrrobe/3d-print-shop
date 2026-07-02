import type { Meta, StoryObj } from '@storybook/vue3-vite'

const radii = [
  { name: 'rounded-card', px: '10px', cls: 'rounded-card' },
  { name: 'rounded-pill-small', px: '21.5px', cls: 'rounded-pill-small' },
  { name: 'rounded-pill-medium', px: '42px', cls: 'rounded-pill-medium' },
  { name: 'rounded-pill-large', px: '46px', cls: 'rounded-pill-large' },
  { name: 'rounded-pill-xl', px: '50px', cls: 'rounded-pill-xl' },
  { name: 'rounded-pill-2xl', px: '52px', cls: 'rounded-pill-2xl' },
  { name: 'rounded-pill-3xl', px: '56px', cls: 'rounded-pill-3xl' },
  { name: 'rounded-pill-4xl', px: '66px', cls: 'rounded-pill-4xl' },
  { name: 'rounded-pill-max', px: '150px', cls: 'rounded-pill-max' },
  { name: 'rounded-full-pill', px: '400px', cls: 'rounded-full-pill' },
]

const meta: Meta = {
  title: 'Showcase/Radius',
  render: () => ({
    setup: () => ({ radii }),
    template: `
      <div class="flex flex-wrap gap-lg">
        <div v-for="entry in radii" :key="entry.name" class="flex flex-col items-center gap-sm">
          <div
            class="flex h-32 w-44 items-center justify-center border border-subtle bg-surface-elevated"
            :class="entry.cls"
          >
            <span class="text-caption text-secondary">{{ entry.px }}</span>
          </div>
          <span class="text-caption text-primary">{{ entry.name }}</span>
        </div>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj

export const Tiles: Story = {}

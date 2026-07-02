import type { Meta, StoryObj } from '@storybook/vue3-vite'

const typeScale = [
  { cls: 'text-display-xl', name: 'display-xl', spec: '96px / 100.8px / -2.88px / 600' },
  { cls: 'text-display-large', name: 'display-large', spec: '72px / 75.6px / -2.16px / 600' },
  { cls: 'text-display-medium', name: 'display-medium', spec: '64px / 70.4px / -1.28px / 600' },
  { cls: 'text-heading-large', name: 'heading-large', spec: '44px / 52.8px / -0.44px / 600' },
  { cls: 'text-heading-medium', name: 'heading-medium', spec: '40px / 48px / -1.6px / 600' },
  { cls: 'text-heading-small', name: 'heading-small', spec: '32px / 38.4px / -1.28px / 600' },
  { cls: 'text-subheading', name: 'subheading', spec: '24px / 28.8px / -0.96px / 600' },
  { cls: 'text-label-medium', name: 'label-medium', spec: '16px / 17.6px / 0.32px / 500' },
  { cls: 'text-body-regular', name: 'body-regular', spec: '14px / 19.6px / 400' },
  { cls: 'text-caption', name: 'caption', spec: '15px / 16.5px / 600' },
]

const meta: Meta = {
  title: 'Showcase/Typography',
  render: () => ({
    setup: () => ({ typeScale }),
    template: `
      <div class="flex flex-col gap-xl">
        <div v-for="entry in typeScale" :key="entry.name" class="flex flex-col gap-xs border-b border-subtle pb-lg">
          <span class="text-caption text-secondary">{{ entry.name }} — {{ entry.spec }}</span>
          <span :class="entry.cls" class="text-primary">Frisch gedruckt</span>
        </div>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj

export const TypeScale: Story = {}

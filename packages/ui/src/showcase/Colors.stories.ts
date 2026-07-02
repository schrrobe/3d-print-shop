import type { Meta, StoryObj } from '@storybook/vue3-vite'

const rawPalette = [
  { name: 'brand-green', hex: '#31a871' },
  { name: 'surface-dark', hex: '#171717' },
  { name: 'surface-warm', hex: '#f6f3ec' },
  { name: 'text-secondary', hex: '#5e5e5e' },
]

const semanticTokens = [
  { name: 'bg-surface', cls: 'bg-surface' },
  { name: 'bg-surface-elevated', cls: 'bg-surface-elevated' },
  { name: 'text-primary', cls: 'bg-primary' },
  { name: 'text-secondary', cls: 'bg-secondary' },
  { name: 'border-subtle', cls: 'bg-subtle' },
  { name: 'bg-brand', cls: 'bg-brand' },
]

const meta: Meta = {
  title: 'Showcase/Color Palette',
  render: () => ({
    setup: () => ({ rawPalette, semanticTokens }),
    template: `
      <div class="flex flex-col gap-xl">
        <div>
          <h3 class="mb-md text-subheading text-primary">Raw-Palette (theme-unabhängig)</h3>
          <div class="flex flex-wrap gap-md">
            <div v-for="color in rawPalette" :key="color.name" class="flex flex-col gap-xs">
              <div class="size-24 rounded-card border border-subtle" :style="{ backgroundColor: color.hex }"></div>
              <span class="text-caption text-primary">{{ color.name }}</span>
              <span class="text-caption text-secondary">{{ color.hex }}</span>
            </div>
          </div>
        </div>
        <div>
          <h3 class="mb-md text-subheading text-primary">Semantische Tokens (wechseln mit Theme)</h3>
          <div class="flex flex-wrap gap-md">
            <div v-for="token in semanticTokens" :key="token.name" class="flex flex-col gap-xs">
              <div class="size-24 rounded-card border border-subtle" :class="token.cls"></div>
              <span class="text-caption text-primary">{{ token.name }}</span>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}
export default meta
type Story = StoryObj

export const Palette: Story = {}

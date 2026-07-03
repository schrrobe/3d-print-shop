import { SOCIAL_PLATFORMS } from '@print-shop/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPlatformBadge from './PsSocialPlatformBadge.vue'

const meta: Meta<typeof PsSocialPlatformBadge> = {
  title: 'Social/SocialPlatformBadge',
  component: PsSocialPlatformBadge,
  args: { platform: 'instagram' },
  argTypes: {
    platform: { control: 'select', options: [...SOCIAL_PLATFORMS] },
  },
  render: (args) => ({
    components: { PsSocialPlatformBadge },
    setup: () => ({ args }),
    template: '<PsSocialPlatformBadge v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPlatformBadge>

export const Instagram: Story = { args: { platform: 'instagram' } }
export const Facebook: Story = { args: { platform: 'facebook' } }

export const BothDark: Story = {
  globals: { theme: 'dark' },
  render: () => ({
    components: { PsSocialPlatformBadge },
    setup: () => ({ platforms: SOCIAL_PLATFORMS }),
    template: `
      <div class="flex gap-sm">
        <PsSocialPlatformBadge v-for="p in platforms" :key="p" :platform="p" />
      </div>
    `,
  }),
}

export const BothLight: Story = {
  ...BothDark,
  globals: { theme: 'light' },
}

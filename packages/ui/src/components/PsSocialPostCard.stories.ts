import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsSocialPostCard from './PsSocialPostCard.vue'
import { SAMPLE_POSTS } from './social-story-fixtures.js'

const meta: Meta<typeof PsSocialPostCard> = {
  title: 'Social/SocialPostCard',
  component: PsSocialPostCard,
  args: { post: SAMPLE_POSTS[1] },
  render: (args) => ({
    components: { PsSocialPostCard },
    setup: () => ({ args }),
    template: '<div class="max-w-80"><PsSocialPostCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsSocialPostCard>

export const Entwurf: Story = { args: { post: SAMPLE_POSTS[0] } }
export const Geplant: Story = { args: { post: SAMPLE_POSTS[1] } }
export const Veroeffentlicht: Story = { args: { post: SAMPLE_POSTS[2] } }
export const FehlgeschlagenMitFehlermeldung: Story = { args: { post: SAMPLE_POSTS[3] } }
export const GeplantLight: Story = { args: { post: SAMPLE_POSTS[1] }, globals: { theme: 'light' } }

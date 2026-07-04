import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import PsRatingStars from './PsRatingStars.vue'

const meta: Meta<typeof PsRatingStars> = {
  title: 'Shop/RatingStars',
  component: PsRatingStars,
  args: { rating: 4.5, ariaLabelText: '4,5 von 5 Sternen' },
  render: (args) => ({
    components: { PsRatingStars },
    setup: () => ({ args }),
    template: '<PsRatingStars v-bind="args" />',
  }),
}
export default meta
type Story = StoryObj<typeof PsRatingStars>

export const Display: Story = {}

export const DisplayGanzzahl: Story = {
  args: { rating: 3, ariaLabelText: '3 von 5 Sternen' },
}

export const Input: Story = {
  render: () => ({
    components: { PsRatingStars },
    setup: () => {
      const value = ref(0)
      const starLabels = ['Sehr schlecht', 'Schlecht', 'Okay', 'Gut', 'Sehr gut']
      return { value, starLabels }
    },
    template: `
      <div class="flex flex-col gap-sm">
        <PsRatingStars
          input
          v-model="value"
          legend-text="Deine Bewertung"
          :star-labels="starLabels"
        />
        <span class="text-caption text-secondary">Ausgewählt: {{ value || '–' }}</span>
      </div>
    `,
  }),
}

export const InputVorbelegt: Story = {
  render: () => ({
    components: { PsRatingStars },
    setup: () => {
      const value = ref(4)
      const starLabels = ['Sehr schlecht', 'Schlecht', 'Okay', 'Gut', 'Sehr gut']
      return { value, starLabels }
    },
    template: `
      <PsRatingStars
        input
        v-model="value"
        legend-text="Deine Bewertung"
        :star-labels="starLabels"
      />
    `,
  }),
}

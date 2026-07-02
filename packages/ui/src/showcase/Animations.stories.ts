import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAnimatedHeadline from '../components/PsAnimatedHeadline.vue'
import PsCard from '../components/PsCard.vue'
import PsMarquee from '../components/PsMarquee.vue'
import PsStatCounter from '../components/PsStatCounter.vue'

const meta: Meta = {
  title: 'Showcase/Animations',
}
export default meta
type Story = StoryObj

export const AnimatedHeadline: Story = {
  render: () => ({
    components: { PsAnimatedHeadline },
    template: '<PsAnimatedHeadline text="Dein Design. Frisch gedruckt. Direkt zu dir." />',
  }),
}

export const StatCounters: Story = {
  render: () => ({
    components: { PsStatCounter },
    template: `
      <div class="flex flex-wrap gap-4xl">
        <PsStatCounter :value="12500" suffix="+" label="Gedruckte Teile" />
        <PsStatCounter :value="14" label="Drucker im Einsatz" :duration-seconds="1" />
        <PsStatCounter :value="98" suffix=" %" label="Zufriedene Kunden" :duration-seconds="2.2" />
      </div>
    `,
  }),
}

export const ProductMarquee: Story = {
  render: () => ({
    components: { PsMarquee },
    template: `
      <PsMarquee :duration-seconds="20">
        <span v-for="name in ['Vasenmodus-Übertopf', 'Kabel-Organizer', 'Wandhalterung', 'Schlüsselbrett', 'Pflanzenschild', 'Ersatzknopf-Set']" :key="name" class="whitespace-nowrap text-subheading text-primary">{{ name }} ·</span>
      </PsMarquee>
    `,
  }),
}

export const CardHover: Story = {
  render: () => ({
    components: { PsCard },
    template: `
      <div class="grid max-w-[48rem] grid-cols-1 gap-lg sm:grid-cols-3">
        <PsCard v-for="index in 3" :key="index" hover>
          <h3 class="text-label-medium text-primary">Karte {{ index }}</h3>
          <p class="mt-sm text-body-regular text-secondary">Bewege die Maus über die Karte, um den Hover-Effekt zu sehen.</p>
        </PsCard>
      </div>
    `,
  }),
}

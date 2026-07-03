import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsReviewCard from './PsReviewCard.vue'

const PHOTO_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#31a871"/><circle cx="80" cy="70" r="34" fill="#f6f3ec"/><rect x="40" y="112" width="80" height="14" rx="7" fill="#171717"/></svg>',
  )

const meta: Meta<typeof PsReviewCard> = {
  title: 'Shop/ReviewCard',
  component: PsReviewCard,
  args: {
    rating: 4,
    ratingAriaLabel: '4 von 5 Sternen',
    title: 'Top Druckqualität',
    body: 'Die Farben sind kräftig und die Passgenauigkeit ist hervorragend. Gerne wieder!',
    displayName: 'Miriam K.',
    dateLabel: '12. Juni 2026',
    verifiedLabel: 'Verifizierter Kauf',
  },
  render: (args) => ({
    components: { PsReviewCard },
    setup: () => ({ args }),
    template: '<div class="max-w-[28rem]"><PsReviewCard v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsReviewCard>

export const Default: Story = {}

export const MitFoto: Story = {
  args: { photoUrl: PHOTO_DATA_URI },
}

export const OhneTitel: Story = {
  args: { title: null, rating: 5, ratingAriaLabel: '5 von 5 Sternen' },
}

export const Lang: Story = {
  args: {
    rating: 3.5,
    ratingAriaLabel: '3,5 von 5 Sternen',
    title: 'Gut, aber mit kleinen Abstrichen',
    body:
      'Die Bestellung kam schnell an und die Verpackung war vorbildlich. ' +
      'Die Druckqualität ist insgesamt sehr ordentlich, allerdings weicht der Grünton ' +
      'auf dem zweiten Motiv leicht von der Vorschau im Konfigurator ab. ' +
      'Der Support hat schnell reagiert und mir einen Rabatt für die nächste Bestellung angeboten. ' +
      'Insgesamt ein solides Erlebnis, bei der Farbverbindlichkeit ist aber noch Luft nach oben. ' +
      'Ich würde trotzdem wieder hier bestellen, weil das Preis-Leistungs-Verhältnis stimmt.',
    displayName: 'Jonas Bergmann',
    dateLabel: '3. Mai 2026',
    verifiedLabel: 'Verifizierter Kauf',
  },
}

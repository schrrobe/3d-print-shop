import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAccordion from './PsAccordion.vue'

const faqItems = [
  {
    value: 'lieferzeit',
    title: 'Wie lange dauert die Lieferung?',
    content: 'Jede Bestellung wird frisch gedruckt. In der Regel liefern wir in 3–5 Werktagen.',
  },
  {
    value: 'material',
    title: 'Welche Materialien verwendet ihr?',
    content: 'Wir drucken standardmäßig mit PLA und PETG von europäischen Herstellern.',
  },
  {
    value: 'retoure',
    title: 'Kann ich meine Bestellung zurückgeben?',
    content: 'Individuell konfigurierte Drucke sind vom Umtausch ausgeschlossen.',
  },
]

const meta: Meta<typeof PsAccordion> = {
  title: 'UI/Accordion',
  component: PsAccordion,
  args: { items: faqItems },
  render: (args) => ({
    components: { PsAccordion },
    setup: () => ({ args }),
    template: '<div class="max-w-[32rem]"><PsAccordion v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsAccordion>

export const Default: Story = {}
export const WithSlotOverride: Story = {
  render: (args) => ({
    components: { PsAccordion },
    setup: () => ({ args }),
    template: `
      <div class="max-w-[32rem]">
        <PsAccordion v-bind="args">
          <template #material>
            <ul class="list-disc pl-lg">
              <li>PLA – matt, biologisch abbaubar</li>
              <li>PETG – wetterfest, lebensmittelecht</li>
            </ul>
          </template>
        </PsAccordion>
      </div>
    `,
  }),
  args: { items: faqItems },
}

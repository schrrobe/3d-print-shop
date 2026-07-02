import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PsAdminSidebar from './PsAdminSidebar.vue'
import PsThemeToggle from './PsThemeToggle.vue'

const navItems = [
  { key: 'dashboard', label: 'Dashboard', href: '#', icon: '📊', active: true },
  { key: 'orders', label: 'Bestellungen', href: '#', icon: '📦' },
  { key: 'production', label: 'Produktion', href: '#', icon: '🖨️' },
  { key: 'printers', label: 'Drucker', href: '#', icon: '⚙️' },
  { key: 'products', label: 'Produkte', href: '#', icon: '🧩' },
  { key: 'customers', label: 'Kunden', href: '#', icon: '👤' },
]

const meta: Meta<typeof PsAdminSidebar> = {
  title: 'Admin/AdminSidebar',
  component: PsAdminSidebar,
  args: { items: navItems },
  render: (args) => ({
    components: { PsAdminSidebar },
    setup: () => ({ args }),
    template: '<div class="h-[480px]"><PsAdminSidebar v-bind="args" /></div>',
  }),
}
export default meta
type Story = StoryObj<typeof PsAdminSidebar>

export const Default: Story = {}
export const WithFooter: Story = {
  render: (args) => ({
    components: { PsAdminSidebar, PsThemeToggle },
    setup: () => ({ args }),
    template: `
      <div class="h-[480px]">
        <PsAdminSidebar v-bind="args">
          <template #footer>
            <div class="flex flex-col gap-sm">
              <PsThemeToggle />
              <span class="text-caption text-secondary">Angemeldet als r.schmidt</span>
            </div>
          </template>
        </PsAdminSidebar>
      </div>
    `,
  }),
}

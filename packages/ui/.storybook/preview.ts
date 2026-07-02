import type { Preview } from '@storybook/vue3-vite'
import '../src/styles.css'

/** Theme toolbar: switches data-theme on <html> exactly like the app does. */
const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark (Brand)' },
          { value: 'light', title: 'Light (Warm)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (story, context) => {
      const theme = (context.globals.theme as string) ?? 'dark'
      document.documentElement.dataset.theme = theme
      document.documentElement.classList.toggle('dark', theme === 'dark')
      document.documentElement.classList.toggle('light', theme === 'light')
      return {
        components: { story },
        template: '<div class="bg-surface text-primary p-lg min-h-[200px]"><story /></div>',
      }
    },
  ],
}

export default preview

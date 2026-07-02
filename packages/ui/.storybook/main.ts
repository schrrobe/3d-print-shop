import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts', '../src/**/*.mdx'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(viteConfig) {
    const { default: vue } = await import('@vitejs/plugin-vue')
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    const plugins = (viteConfig.plugins ?? []).flat()
    const hasVuePlugin = plugins.some(
      (plugin) => plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'vite:vue',
    )
    viteConfig.plugins = [...plugins, ...(hasVuePlugin ? [] : [vue()]), tailwindcss()]
    return viteConfig
  },
}

export default config

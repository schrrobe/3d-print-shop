import { vueConfig } from '@print-shop/config/eslint'

export default vueConfig([
  {
    ignores: ['.nuxt/**', '.output/**'],
  },
  {
    files: ['**/*.vue', '**/*.ts'],
    rules: {
      // Nuxt auto-imports (defineNuxtConfig, useFetch, ref, …) are not visible to eslint here
      'no-undef': 'off',
    },
  },
])

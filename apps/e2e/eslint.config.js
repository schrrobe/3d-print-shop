import { nodeConfig } from '@print-shop/config/eslint'

export default nodeConfig([
  {
    rules: {
      // Playwright fixtures use empty destructuring patterns
      'no-empty-pattern': 'off',
    },
  },
])

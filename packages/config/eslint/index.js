import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.output/**',
    '**/.nuxt/**',
    '**/.turbo/**',
    '**/storybook-static/**',
    '**/coverage/**',
    '**/prisma/generated/**',
    '**/test-results/**',
    '**/playwright-report/**',
  ],
}

const sharedRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
}

/** Flat config for Node/TypeScript packages (api, utils, validators, …). */
export function nodeConfig(extra = []) {
  return tseslint.config(
    ignores,
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        globals: { ...globals.node },
      },
      rules: sharedRules,
    },
    prettier,
    ...extra,
  )
}

/** Flat config for Vue 3 + TypeScript packages (web, ui). */
export function vueConfig(extra = []) {
  return tseslint.config(
    ignores,
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...vue.configs['flat/recommended'],
    {
      files: ['**/*.vue'],
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          parser: tseslint.parser,
          extraFileExtensions: ['.vue'],
          sourceType: 'module',
        },
      },
    },
    {
      languageOptions: {
        globals: { ...globals.browser, ...globals.node },
      },
      rules: {
        ...sharedRules,
        'vue/multi-word-component-names': 'off',
        'vue/require-default-prop': 'off',
        'vue/html-self-closing': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/html-indent': 'off',
        'vue/html-closing-bracket-newline': 'off',
        'vue/first-attribute-linebreak': 'off',
      },
    },
    prettier,
    ...extra,
  )
}

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default [
  { ignores: ['**/node_modules/**', '**/.output/**', '**/.nuxt/**', '**/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  vue.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  }
]


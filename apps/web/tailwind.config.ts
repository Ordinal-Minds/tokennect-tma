import type { Config } from 'tailwindcss'
import preset from '@miniapp/tailwind-config'

export default <Partial<Config>>{
  // Force Tailwind to only apply dark styles when a `.dark` class is present (we never add it)
  darkMode: 'class',
  presets: [preset],
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './plugins/**/*.{js,ts}'
  ]
}

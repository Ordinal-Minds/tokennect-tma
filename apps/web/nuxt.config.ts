// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/tailwindcss'],
  devtools: { enabled: true },
  typescript: { strict: true, typeCheck: true },
  css: ['~/assets/css/tailwind.css'],
  // Nuxt UI theme tweaks to align with our Tailwind preset
  ui: {
    // Disable Nuxt UI color mode to force light globally
    colorMode: false,
    primary: 'blue',
    gray: 'slate',
    radius: 'lg'
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
      tmaDevSecret: process.env.NUXT_PUBLIC_TMA_DEV_SECRET || ''
    }
  },
  tailwindcss: { viewer: false }
})

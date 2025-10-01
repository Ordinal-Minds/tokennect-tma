import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  srcDir: 'server',
  devServer: {
    port: 3001
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        strict: true
      }
    }
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL
  }
})


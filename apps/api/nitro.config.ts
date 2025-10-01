import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: 'server',
  devServer: {},
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        strict: true,
      },
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    tmaDevSecret: process.env.TMA_DEV_SECRET,
  },
})

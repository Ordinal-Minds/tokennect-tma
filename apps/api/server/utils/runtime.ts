export interface RuntimeConfig {
  databaseUrl?: string
  telegramBotToken?: string
  jwtSecret: string
  tmaDevSecret?: string
}

export function getRuntimeConfig(): RuntimeConfig {
  const cfg: RuntimeConfig = {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  }
  if (process.env.DATABASE_URL) cfg.databaseUrl = process.env.DATABASE_URL
  if (process.env.TELEGRAM_BOT_TOKEN) cfg.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  if (process.env.TMA_DEV_SECRET) cfg.tmaDevSecret = process.env.TMA_DEV_SECRET
  return cfg
}

export interface RuntimeConfig {
  databaseUrl?: string
  telegramBotToken?: string
  jwtSecret: string
  tmaDevSecret?: string
  tonApiEndpoint?: string
  tonApiKey?: string
  botWalletMnemonic?: string
  botWalletPrivateKeyHex?: string
}

import fs from 'node:fs'
import path from 'node:path'

let envLoaded = false

function loadEnvDevIfNeeded() {
  // In development, ensure basic .env is loaded so mock auth works
  if (envLoaded) return
  if (process.env.NODE_ENV === 'production') return
  try {
    // Only attempt if key vars are missing
    const needs = !process.env.TMA_DEV_SECRET || !process.env.JWT_SECRET || !process.env.TELEGRAM_BOT_TOKEN || !process.env.DATABASE_URL
    if (!needs) {
      envLoaded = true
      return
    }
    const envPath = path.resolve(process.cwd(), '.env')
    let text = ''
    try {
      text = fs.readFileSync(envPath, 'utf8')
    } catch {
      envLoaded = true
      return
    }
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  } catch {
    // Best-effort only
  } finally {
    envLoaded = true
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  // Ensure dev .env is loaded so secrets exist during development
  // (no-op in production)
  loadEnvDevIfNeeded()
  const cfg: RuntimeConfig = {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  }
  if (process.env.DATABASE_URL) cfg.databaseUrl = process.env.DATABASE_URL
  if (process.env.TELEGRAM_BOT_TOKEN) cfg.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  if (process.env.TMA_DEV_SECRET) cfg.tmaDevSecret = process.env.TMA_DEV_SECRET
  if (process.env.TON_API_ENDPOINT) cfg.tonApiEndpoint = process.env.TON_API_ENDPOINT
  if (process.env.TON_API_KEY) cfg.tonApiKey = process.env.TON_API_KEY
  if (process.env.BOT_WALLET_MNEMONIC) cfg.botWalletMnemonic = process.env.BOT_WALLET_MNEMONIC
  if (process.env.BOT_WALLET_PRIVATE_KEY_HEX) cfg.botWalletPrivateKeyHex = process.env.BOT_WALLET_PRIVATE_KEY_HEX
  return cfg
}

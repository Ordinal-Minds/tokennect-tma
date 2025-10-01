import crypto from 'node:crypto'

export interface TelegramInitDataUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface VerifyResult {
  ok: boolean
  reason?: string
  authDate?: number
  user?: TelegramInitDataUser
  raw?: Record<string, string>
}

function parseInitData(initData: string): Record<string, string> {
  const params = new URLSearchParams(initData)
  const out: Record<string, string> = {}
  for (const [k, v] of params.entries()) {
    out[k] = v
  }
  return out
}

export function verifyTelegramInitData(initData: string, botToken: string, maxAgeSec: number = 86400): VerifyResult {
  try {
    const data = parseInitData(initData)
    const hash = data.hash
    if (!hash) return { ok: false, reason: 'hash_missing' }
    const entries = Object.entries(data)
      .filter(([k]) => k !== 'hash')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    // secret_key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const computed = crypto.createHmac('sha256', secretKey).update(entries).digest('hex')

    const a = Buffer.from(hash, 'hex')
    const b = Buffer.from(computed, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: 'hash_mismatch' }
    }

    let authDate: number | undefined
    if (data.auth_date) {
      const n = Number(data.auth_date)
      if (!Number.isNaN(n)) authDate = n
    }
    if (authDate) {
      const now = Math.floor(Date.now() / 1000)
      if (now - authDate > maxAgeSec) return { ok: false, reason: 'stale_auth_date', authDate, raw: data }
    }

    let user: TelegramInitDataUser | undefined
    if (data.user) {
      try {
        user = JSON.parse(data.user) as TelegramInitDataUser
      } catch {}
    }
    return {
      ok: true,
      ...(authDate !== undefined ? { authDate } : {}),
      ...(user ? { user } : {}),
      raw: data,
    }
  } catch (e) {
    return { ok: false, reason: 'exception' }
  }
}

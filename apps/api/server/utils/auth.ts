import { H3Event, createError, getRequestHeaders } from 'h3'
import { getRuntimeConfig } from './runtime'
import { verifyJwtHS256, JwtPayload } from './jwt'

export type AuthContext = {
  userId: string
  tgid: string
  jwt: string
  payload: JwtPayload
}

export function getBearerToken(event: H3Event): string | null {
  const headers = getRequestHeaders(event)
  const hLower = typeof headers.authorization === 'string' ? headers.authorization : null
  // Some clients send 'Authorization' case; include it defensively
  const hUpper = typeof (headers as any).Authorization === 'string' ? (headers as any).Authorization as string : null
  const auth: string | null = hLower || hUpper
  if (!auth) return null
  const m = auth.match(/^Bearer\s+(.+)$/i)
  return m && m[1] ? m[1] : null
}

export function requireAuth(event: H3Event): AuthContext {
  const token = getBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })
  }
  const runtime = getRuntimeConfig()
  const payload = verifyJwtHS256(token, runtime.jwtSecret)
  if (!payload || !payload.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
  const tgid = (payload.tgid ?? payload.telegram_id ?? payload.tg) as string | number | undefined
  if (!tgid) {
    throw createError({ statusCode: 400, statusMessage: 'Token missing Telegram id' })
  }
  return { userId: String(payload.sub), tgid: String(tgid), jwt: token, payload }
}

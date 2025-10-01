import crypto from 'node:crypto'

function base64url(input: Buffer | string): string {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return source.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function fromBase64url(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4)
  return Buffer.from(b64, 'base64')
}

export interface JwtPayload {
  [key: string]: unknown
  iat?: number
  exp?: number
  sub?: string
}

export function signJwtHS256(payload: JwtPayload, secret: string, expiresInSec: number = 60 * 60 * 24 * 7): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const nowSec = Math.floor(Date.now() / 1000)
  const body: JwtPayload = { iat: nowSec, exp: nowSec + expiresInSec, ...payload }
  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(body))
  const data = `${headerB64}.${payloadB64}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest()
  const sigB64 = base64url(sig)
  return `${data}.${sigB64}`
}

export function verifyJwtHS256(token: string, secret: string): JwtPayload | null {
  try {
    const [h, p, s] = token.split('.')
    if (!h || !p || !s) return null
    const data = `${h}.${p}`
    const expected = base64url(crypto.createHmac('sha256', secret).update(data).digest())
    // timing-safe compare
    const a = Buffer.from(s)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    const payload = JSON.parse(fromBase64url(p).toString('utf8')) as JwtPayload
    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp === 'number' && now > payload.exp) return null
    return payload
  } catch {
    return null
  }
}


import { eventHandler, readBody, createError } from 'h3'
import { getRuntimeConfig } from '../../utils/runtime'
import { prisma } from '../../utils/prisma'
import { signJwtHS256 } from '../../utils/jwt'

export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const runtime = getRuntimeConfig()
  const devSecret = runtime.tmaDevSecret
  const body = await readBody<{ secret?: string; user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } }>(event)
  if (!devSecret || !body?.secret || body.secret !== devSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const tUser = body.user
  if (!tUser || typeof tUser.id !== 'number' || !tUser.first_name) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user' })
  }

  const syntheticEmail = `tg${tUser.id}@telegram.local`
  const displayName = [tUser.first_name, tUser.last_name].filter(Boolean).join(' ')

  let user = await prisma.user.findUnique({ where: { email: syntheticEmail } })
  if (!user) {
    user = await prisma.user.create({ data: { email: syntheticEmail, name: displayName || tUser.username || `tg-${tUser.id}` } })
  } else if (displayName && user.name !== displayName) {
    await prisma.user.update({ where: { id: user.id }, data: { name: displayName } })
  }

  const secret = runtime.jwtSecret as string
  const token = signJwtHS256({ sub: user.id, tgid: tUser.id, v: 'mock' }, secret, 60 * 60 * 24 * 7)

  return {
    ok: true,
    userId: user.id,
    token,
    telegram: {
      id: tUser.id,
      username: tUser.username || null,
      first_name: tUser.first_name,
      last_name: tUser.last_name || null,
      photo_url: tUser.photo_url || null
    }
  }
})

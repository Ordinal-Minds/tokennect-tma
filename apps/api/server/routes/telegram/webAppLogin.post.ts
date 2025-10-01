import { eventHandler, readBody, createError } from 'h3'
import { getRequestURL } from 'h3'
import { prisma } from '../../utils/prisma'
import { verifyTelegramInitData } from '../../utils/telegram'
import { signJwtHS256 } from '../../utils/jwt'
import { getRuntimeConfig } from '../../utils/runtime'

export default eventHandler(async (event) => {
  const url = getRequestURL(event)
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const runtime = getRuntimeConfig()
  const botToken = runtime.telegramBotToken
  if (!botToken) {
    throw createError({ statusCode: 500, statusMessage: 'TELEGRAM_BOT_TOKEN not configured' })
  }

  const body = await readBody<{ initData?: string; initDataUnsafe?: any; platform?: string; version?: string; startParam?: string }>(event)
  const initData = body?.initData
  if (!initData || initData.length < 16) {
    throw createError({ statusCode: 400, statusMessage: 'initData missing' })
  }

  const verified = verifyTelegramInitData(initData, botToken)
  if (!verified.ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid initData' })
  }

  // Prefer user from initData (telegram provides this as JSON string), otherwise try body.initDataUnsafe.user
  const tUser = verified.user || (body?.initDataUnsafe?.user as any) || null
  if (!tUser || typeof tUser.id !== 'number' || !tUser.first_name) {
    throw createError({ statusCode: 400, statusMessage: 'Telegram user missing' })
  }

  // Create/find a local user mapped from Telegram
  // Minimal approach: synthesize a unique email to satisfy schema
  const syntheticEmail = `tg${tUser.id}@telegram.local`
  const displayName = [tUser.first_name, tUser.last_name].filter(Boolean).join(' ')

  let user = await prisma.user.findUnique({ where: { email: syntheticEmail } })
  if (!user) {
    user = await prisma.user.create({ data: { email: syntheticEmail, name: displayName || tUser.username || `tg-${tUser.id}` } })
  } else if (displayName && user.name !== displayName) {
    // keep name fresh when available
    await prisma.user.update({ where: { id: user.id }, data: { name: displayName } })
  }

  // Mint a short-lived JWT token to represent session
  const secret = runtime.jwtSecret as string
  const token = signJwtHS256({ sub: user.id, tgid: tUser.id, platform: body?.platform, v: body?.version }, secret, 60 * 60 * 24 * 7)

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

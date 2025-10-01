import { eventHandler, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default eventHandler(async (event) => {
  const { tgid } = requireAuth(event)
  const bot = await prisma.bot.findUnique({ where: { ownerTgId: tgid } })
  if (!bot) throw createError({ statusCode: 404, statusMessage: 'Bot not found' })

  const updated = await prisma.bot.update({
    where: { ownerTgId: tgid },
    data: { lastMessageAt: new Date() }
  })

  const now = new Date()
  const last = updated.lastMessageAt ? new Date(updated.lastMessageAt) : null
  const rate = updated.rateLimitSeconds
  const deltaSec = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000)) : Infinity
  const secondsUntilNext = !last ? 0 : Math.max(0, rate - deltaSec)
  const nextReady = !last ? now : new Date(last.getTime() + rate * 1000)

  return {
    ok: true,
    availability: {
      available: secondsUntilNext === 0,
      secondsUntilNext,
      nextMessageReadyAt: nextReady.toISOString()
    }
  }
})


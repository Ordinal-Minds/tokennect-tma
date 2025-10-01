import { eventHandler, createError } from 'h3'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../utils/auth'

function toDto(bot: any) {
  if (!bot) return null
  const now = new Date()
  const last = bot.lastMessageAt ? new Date(bot.lastMessageAt) : null
  const rate = typeof bot.rateLimitSeconds === 'number' ? bot.rateLimitSeconds : 0
  const deltaSec = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000)) : Infinity
  const secondsUntilNext = !last ? 0 : Math.max(0, rate - deltaSec)
  const nextReady = !last ? now : new Date(last.getTime() + rate * 1000)
  return {
    id: bot.id,
    ownerTgId: bot.ownerTgId,
    handle: bot.handle,
    headline: bot.headline,
    summary: bot.summary,
    lookingFor: bot.lookingFor,
    offering: bot.offering,
    tags: bot.tags || [],
    private: bot.private ?? {},
    rateLimitSeconds: bot.rateLimitSeconds,
    concurrency: bot.concurrency,
    maxConversationLength: bot.maxConversationLength,
    lastMessageAt: bot.lastMessageAt ? new Date(bot.lastMessageAt).toISOString() : null,
    isActive: bot.isActive,
    createdAt: bot.createdAt.toISOString(),
    updatedAt: bot.updatedAt.toISOString(),
    availability: {
      available: secondsUntilNext === 0,
      secondsUntilNext,
      nextMessageReadyAt: nextReady.toISOString()
    }
  }
}

export default eventHandler(async (event) => {
  const { tgid } = requireAuth(event)

  const bot = await prisma.bot.findUnique({ where: { ownerTgId: tgid } }).catch((e) => {
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  })

  if (!bot) return { ok: true, bot: null }
  return { ok: true, bot: toDto(bot) }
})


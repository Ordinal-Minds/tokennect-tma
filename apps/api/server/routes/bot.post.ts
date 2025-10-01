import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../utils/auth'

function sanitizeArray(val: any): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v)).filter((s) => s.length > 0)
  if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

function trimOrNull(v: any): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

function nonEmptyString(v: any): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

function computeSearchText(input: {
  headline?: string | null
  summary?: string | null
  lookingFor?: string | null
  offering?: string | null
  tags?: string[]
}): string {
  const parts: string[] = []
  if (input.headline) parts.push(String(input.headline))
  if (input.summary) parts.push(String(input.summary))
  if (input.lookingFor) parts.push('Looking for: ' + String(input.lookingFor))
  if (input.offering) parts.push('Offering: ' + String(input.offering))
  if (input.tags && input.tags.length) parts.push('Tags: ' + input.tags.map((t) => `#${t}`).join(' '))
  return parts.join('\n').trim()
}

export default eventHandler(async (event) => {
  const { tgid } = requireAuth(event)
  const body = await readBody<any>(event)

  const isUpdate = Boolean(await prisma.bot.findUnique({ where: { ownerTgId: tgid } }))

  // Normalize inputs
  const handle = nonEmptyString(body?.handle)
  const headline = nonEmptyString(body?.headline) || ''
  const summary = trimOrNull(body?.summary) || ''
  const lookingFor = trimOrNull(body?.lookingFor)
  const offering = trimOrNull(body?.offering)
  const tags = sanitizeArray(body?.tags)
  const privateData = (typeof body?.private === 'object' && body?.private !== null) ? body.private : {}
  let rateLimitSeconds = Number.isFinite(body?.rateLimitSeconds) ? Math.max(0, Math.floor(Number(body.rateLimitSeconds))) : undefined
  let concurrency = Number.isFinite(body?.concurrency) ? Math.max(1, Math.floor(Number(body.concurrency))) : undefined
  let maxConversationLength = Number.isFinite(body?.maxConversationLength) ? Math.max(1, Math.floor(Number(body.maxConversationLength))) : undefined
  const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined

  if (!isUpdate) {
    if (!handle) throw createError({ statusCode: 400, statusMessage: 'handle is required' })
  }

  const searchText = computeSearchText({ headline, summary, lookingFor, offering, tags })

  try {
    const bot = await prisma.bot.upsert({
      where: { ownerTgId: tgid },
      create: {
        ownerTgId: tgid,
        handle: handle!,
        headline,
        summary,
        lookingFor,
        offering,
        tags,
        searchText,
        private: privateData,
        rateLimitSeconds: rateLimitSeconds ?? 10,
        concurrency: concurrency ?? 1,
        maxConversationLength: maxConversationLength ?? 50,
        isActive: isActive ?? true
      },
      update: {
        ...(handle ? { handle } : {}),
        headline,
        summary,
        lookingFor,
        offering,
        tags,
        searchText,
        private: privateData,
        ...(rateLimitSeconds !== undefined ? { rateLimitSeconds } : {}),
        ...(concurrency !== undefined ? { concurrency } : {}),
        ...(maxConversationLength !== undefined ? { maxConversationLength } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      }
    })

    // Compose availability
    const now = new Date()
    const last = bot.lastMessageAt ? new Date(bot.lastMessageAt) : null
    const rate = bot.rateLimitSeconds
    const deltaSec = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000)) : Infinity
    const secondsUntilNext = !last ? 0 : Math.max(0, rate - deltaSec)
    const nextReady = !last ? now : new Date(last.getTime() + rate * 1000)

    return {
      ok: true,
      bot: {
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
  } catch (e: any) {
    if (e?.code === 'P2002') {
      // Unique constraint failed (likely handle)
      throw createError({ statusCode: 409, statusMessage: 'Handle already taken' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to save bot' })
  }
})


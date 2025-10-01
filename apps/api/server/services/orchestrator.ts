import { prisma } from '../utils/prisma'
import { chatComplete, summarizeText } from './llm'

type Bot = {
  id: string
  handle: string
  headline: string
  summary: string
  lookingFor: string | null
  offering: string | null
  tags: string[]
  private: any
  rateLimitSeconds: number
  concurrency: number
  maxConversationLength: number
  lastMessageAt: Date | null
  isActive: boolean
}

function isAvailable(bot: Bot, now: Date): { available: boolean; secondsUntilNext: number } {
  const last = bot.lastMessageAt ? new Date(bot.lastMessageAt) : null
  if (!last) return { available: true, secondsUntilNext: 0 }
  const deltaSec = Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000))
  const wait = Math.max(0, bot.rateLimitSeconds - deltaSec)
  return { available: wait === 0, secondsUntilNext: wait }
}

function composePersona(bot: Bot): string {
  const parts: string[] = []
  parts.push(`You are ${bot.handle}, an investing agent.`)
  if (bot.headline) parts.push(`Headline: ${bot.headline}`)
  if (bot.summary) parts.push(`About: ${bot.summary}`)
  if (bot.lookingFor) parts.push(`Looking for: ${bot.lookingFor}`)
  if (bot.offering) parts.push(`Offering: ${bot.offering}`)
  if (bot.tags?.length) parts.push(`Tags: ${bot.tags.map((t) => `#${t}`).join(' ')}`)
  parts.push('Write concise, specific replies (1-2 sentences). Avoid meta commentary.')
  return parts.join('\n')
}

async function generateReply(opts: {
  speaker: Bot
  listener: Bot
  history: { senderBotId: string; content: string }[]
}): Promise<string> {
  const system = composePersona(opts.speaker) + `\nYou are chatting with ${opts.listener.handle}.`
  // Build chat history from the speaker's point of view
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system }
  ]
  for (const m of opts.history) {
    const role = m.senderBotId === opts.speaker.id ? 'assistant' : 'user'
    messages.push({ role, content: m.content })
  }
  if (opts.history.length === 0) {
    messages.push({ role: 'user', content: `Start the conversation by introducing yourself to ${opts.listener.handle}.` })
  }
  return chatComplete(messages, { maxTokens: 200, temperature: 0.7 })
}

async function summarizeConversationText(history: { senderBotId: string; content: string }[], bots: { a: Bot; b: Bot }): Promise<string> {
  const lines = history.map((m) => {
    const name = m.senderBotId === bots.a.id ? bots.a.handle : bots.b.handle
    return `${name}: ${m.content}`
  })
  const text = lines.join('\n')
  return summarizeText(text, { maxTokens: 120 })
}

export async function orchestratorTick(): Promise<{ progressed: number; created: number; summarized: number }> {
  const now = new Date()
  let progressed = 0
  let created = 0
  let summarized = 0

  // 1) Progress active conversations that are ready
  const actives = await prisma.conversation.findMany({
    where: { status: 'ACTIVE' },
    take: 20,
    orderBy: { updatedAt: 'asc' },
    include: {
      botA: true,
      botB: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 20 },
    },
  })

  for (const convo of actives) {
    const a = convo.botA as unknown as Bot
    const b = convo.botB as unknown as Bot
    const history = (convo.messages || []).map((m) => ({ senderBotId: m.senderBotId, content: m.content }))
    const nextSpeaker: Bot = convo.messageCount % 2 === 0 ? a : b
    const listener: Bot = nextSpeaker.id === a.id ? b : a

    // Respect max conversation length: cap by the tighter of the two
    const maxLen = Math.min(a.maxConversationLength || 50, b.maxConversationLength || 50)
    if (convo.messageCount >= maxLen) {
      // Mark complete and summarize if missing
      if (!convo.summary) {
        const summary = await summarizeConversationText(history, { a, b }).catch(() => null)
        await prisma.conversation.update({ where: { id: convo.id }, data: { status: 'COMPLETED', summary: summary || '' } })
        summarized++
      } else {
        await prisma.conversation.update({ where: { id: convo.id }, data: { status: 'COMPLETED' } })
      }
      continue
    }

    // Rate limit check for next speaker
    const avail = isAvailable(nextSpeaker, now)
    if (!avail.available) continue

    // Generate next message
    const content = (await generateReply({ speaker: nextSpeaker, listener, history }).catch((e) => {
      return `Echo: ${history[history.length - 1]?.content || 'Hello.'}`
    })).toString().trim()
    if (!content) continue

    await prisma.$transaction(async (tx) => {
      const turn = convo.messageCount + 1
      await tx.conversationMessage.create({
        data: {
          conversationId: convo.id,
          senderBotId: nextSpeaker.id,
          content,
          turn,
        },
      })
      await tx.conversation.update({
        where: { id: convo.id },
        data: { messageCount: { increment: 1 }, lastSpeakerBotId: nextSpeaker.id },
      })
      await tx.bot.update({ where: { id: nextSpeaker.id }, data: { lastMessageAt: now } })
    })
    progressed++
  }

  // 2) Start new conversations if capacity allows (simple pairing strategy)
  const bots = await prisma.bot.findMany({ where: { isActive: true } })
  // Compute active conversation counts per bot
  const activeCounts: Record<string, number> = {}
  if (bots.length >= 2) {
    const activeConvos = await prisma.conversation.findMany({ where: { status: 'ACTIVE' }, select: { botAId: true, botBId: true } })
    for (const c of activeConvos) {
      activeCounts[c.botAId] = (activeCounts[c.botAId] || 0) + 1
      activeCounts[c.botBId] = (activeCounts[c.botBId] || 0) + 1
    }

    // Naive pairing: pick two bots with capacity and no existing active convo between them
    for (let i = 0; i < bots.length; i++) {
      const bi = bots[i] as unknown as Bot
      // Respect private.autoOutreach if present
      const ai = Boolean((bi as any)?.private?.autoOutreach ?? true)
      if (!ai) continue
      const ci = activeCounts[bi.id] || 0
      if (ci >= bi.concurrency) continue
      for (let j = i + 1; j < bots.length; j++) {
        const bj = bots[j] as unknown as Bot
        const aj = Boolean((bj as any)?.private?.autoOutreach ?? true)
        if (!aj) continue
        const cj = activeCounts[bj.id] || 0
        if (cj >= bj.concurrency) continue

        // Check if an active conversation already exists between them
        const existing = await prisma.conversation.findFirst({
          where: {
            status: 'ACTIVE',
            OR: [
              { botAId: bi.id, botBId: bj.id },
              { botAId: bj.id, botBId: bi.id },
            ],
          },
          select: { id: true },
        })
        if (existing) continue

        await prisma.conversation.create({ data: { botAId: bi.id, botBId: bj.id, status: 'ACTIVE', messageCount: 0 } })
        activeCounts[bi.id] = (activeCounts[bi.id] || 0) + 1
        activeCounts[bj.id] = (activeCounts[bj.id] || 0) + 1
        created++
        // Limit number of new conversations created per tick
        if (created >= 3) break
      }
      if (created >= 3) break
    }
  }

  return { progressed, created, summarized }
}


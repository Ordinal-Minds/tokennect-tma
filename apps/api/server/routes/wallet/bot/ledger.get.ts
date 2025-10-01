import { eventHandler, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'

export default eventHandler(async (event) => {
  const auth = requireAuth(event)
  const bot = await prisma.bot.findUnique({ where: { ownerTgId: auth.tgid } })
  if (!bot) throw createError({ statusCode: 404, statusMessage: 'Bot not found' })

  const entries = await prisma.botLedger.findMany({
    where: { botId: bot.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return {
    ok: true,
    ledger: entries.map((e) => ({
      id: e.id,
      deltaNano: e.deltaNano.toString(),
      type: e.type,
      status: e.status,
      txHash: e.txHash,
      commentTag: e.commentTag,
      createdAt: e.createdAt,
    })),
  }
})


import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import { tonToNano, validateTonAddress } from '../../../services/ton'

// Queue a payout to be executed by the TX orchestrator
export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  const auth = requireAuth(event)
  const body = await readBody<{ amountTon?: string; to?: string; memo?: string }>(event)

  const amountTon = (body?.amountTon || '').trim()
  if (!amountTon) throw createError({ statusCode: 400, statusMessage: 'amountTon is required' })
  const amountNano = tonToNano(amountTon)
  if (amountNano <= 0n) throw createError({ statusCode: 400, statusMessage: 'amount must be > 0' })

  const bot = await prisma.bot.findUnique({ where: { ownerTgId: auth.tgid } })
  if (!bot) throw createError({ statusCode: 404, statusMessage: 'Bot not found' })

  let to = (body?.to || '').trim()
  if (!to) {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    to = (user?.walletAddressTon || '').trim()
  }
  if (!to) throw createError({ statusCode: 400, statusMessage: 'No destination address. Link wallet or provide `to`.' })
  if (!validateTonAddress(to)) throw createError({ statusCode: 400, statusMessage: 'Invalid TON address' })

  if (bot.tonBalanceNano < amountNano) throw createError({ statusCode: 400, statusMessage: 'Insufficient balance' })

  const commentTag = `to:${to}${body?.memo ? `|memo:${body.memo}` : ''}`

  await prisma.$transaction(async (tx) => {
    // Reserve funds immediately
    await tx.bot.update({ where: { id: bot.id }, data: { tonBalanceNano: { decrement: amountNano } } })
    await tx.botLedger.create({
      data: {
        botId: bot.id,
        deltaNano: -amountNano,
        type: 'WITHDRAW',
        status: 'PENDING',
        commentTag,
      },
    })
  })

  return { ok: true }
})


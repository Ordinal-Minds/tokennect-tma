import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import { tonToNano } from '../../../services/ton'

export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  const auth = requireAuth(event)
  const body = await readBody<{ toHandle?: string; toBotId?: string; amountTon?: string; memo?: string }>(event)
  const amountTon = (body?.amountTon || '').trim()
  if (!amountTon) throw createError({ statusCode: 400, statusMessage: 'amountTon is required' })
  const amountNano = tonToNano(amountTon)
  if (amountNano <= 0n) throw createError({ statusCode: 400, statusMessage: 'amount must be > 0' })

  const source = await prisma.bot.findUnique({ where: { ownerTgId: auth.tgid } })
  if (!source) throw createError({ statusCode: 404, statusMessage: 'Source bot not found' })

  let target = null as typeof source | null
  if (body?.toBotId) {
    target = await prisma.bot.findUnique({ where: { id: body.toBotId } })
  } else if (body?.toHandle) {
    target = await prisma.bot.findUnique({ where: { handle: body.toHandle } })
  }
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Target bot not found' })
  if (target.id === source.id) throw createError({ statusCode: 400, statusMessage: 'Cannot transfer to same bot' })

  // Check balance
  if (source.tonBalanceNano < amountNano) throw createError({ statusCode: 400, statusMessage: 'Insufficient balance' })

  // Atomic transfer: debit source, credit target, create two ledger records
  await prisma.$transaction(async (tx) => {
    await tx.bot.update({ where: { id: source.id }, data: { tonBalanceNano: { decrement: amountNano } } })
    await tx.bot.update({ where: { id: target!.id }, data: { tonBalanceNano: { increment: amountNano } } })
    await tx.botLedger.create({
      data: {
        botId: source.id,
        deltaNano: -amountNano,
        type: 'TRANSFER',
        status: 'CONFIRMED',
        counterpartyBotId: target!.id,
        commentTag: body?.memo ?? null
      }
    })
    await tx.botLedger.create({
      data: {
        botId: target!.id,
        deltaNano: amountNano,
        type: 'TRANSFER',
        status: 'CONFIRMED',
        counterpartyBotId: source.id,
        commentTag: body?.memo ?? null
      }
    })
  })

  return { ok: true }
})

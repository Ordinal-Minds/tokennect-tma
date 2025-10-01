import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import { sendTon, tonToNano, validateTonAddress } from '../../../services/ton'

export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  const auth = requireAuth(event)
  const body = await readBody<{ amountTon?: string; to?: string }>(event)
  const amountTon = (body?.amountTon || '').trim()
  if (!amountTon) throw createError({ statusCode: 400, statusMessage: 'amountTon is required' })
  const amountNano = tonToNano(amountTon)
  if (amountNano <= 0n) throw createError({ statusCode: 400, statusMessage: 'amount must be > 0' })

  const user = await prisma.user.findUnique({ where: { id: auth.userId } })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  const bot = await prisma.bot.findUnique({ where: { ownerTgId: auth.tgid } })
  if (!bot) throw createError({ statusCode: 404, statusMessage: 'Bot not found' })

  const dest = (body?.to || user.walletAddressTon || '').trim()
  if (!dest) throw createError({ statusCode: 400, statusMessage: 'No destination address. Link wallet or provide `to`.' })
  if (!validateTonAddress(dest)) throw createError({ statusCode: 400, statusMessage: 'Invalid TON address' })

  if (bot.tonBalanceNano < amountNano) throw createError({ statusCode: 400, statusMessage: 'Insufficient balance' })
  // MVP safeguard: 25 TON per withdrawal
  if (tonToNano(amountTon) > tonToNano('25')) throw createError({ statusCode: 400, statusMessage: 'Amount exceeds 25 TON limit (MVP safeguard)' })

  // Attempt to send first to ensure chain acceptance
  const res = await sendTon({ to: dest, amountTon, comment: `withdrawal:${auth.userId}` })
  const txRef = `seqno:${res.seqno}`

  await prisma.$transaction(async (tx) => {
    await tx.bot.update({ where: { id: bot.id }, data: { tonBalanceNano: { decrement: amountNano } } })
    await tx.botLedger.create({
      data: {
        botId: bot.id,
        deltaNano: -amountNano,
        type: 'WITHDRAW',
        status: 'CONFIRMED',
        txHash: txRef,
        commentTag: `to:${dest}`
      }
    })
  })

  return { ok: true, seqno: res.seqno }
})


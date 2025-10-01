import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { sendTon } from '../../services/ton'

export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  const auth = requireAuth(event)
  const body = await readBody<{ amountTon?: string }>(event)
  const amountTon = String(body?.amountTon || '').trim()
  if (!amountTon) throw createError({ statusCode: 400, statusMessage: 'amountTon is required, e.g., "0.5"' })

  const user = await prisma.user.findUnique({ where: { id: auth.userId } })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!user.walletAddressTon) throw createError({ statusCode: 400, statusMessage: 'No linked TON wallet' })

  // Basic sanity limit for MVP to prevent draining by mistake
  const amt = parseFloat(amountTon)
  if (!Number.isFinite(amt) || amt <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid amountTon' })
  if (amt > 10) throw createError({ statusCode: 400, statusMessage: 'Amount exceeds 10 TON limit (MVP safeguard)' })

  const res = await sendTon({ to: user.walletAddressTon, amountTon, comment: `withdrawal:${auth.userId}` })
  return { ok: true, seqno: res.seqno }
})


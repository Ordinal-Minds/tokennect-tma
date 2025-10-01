import { prisma } from '../utils/prisma'
import { sendTon, validateTonAddress } from './ton'

type PendingWithdrawal = {
  id: string
  botId: string
  deltaNano: bigint
  commentTag: string | null
}

function parseCommentTag(tag: string | null): { to?: string; memo?: string } {
  const out: { to?: string; memo?: string } = {}
  if (!tag) return out
  // Format: to:EQ...|memo:hello world
  for (const part of tag.split('|')) {
    const [k, ...rest] = part.split(':')
    const key = k?.trim().toLowerCase()
    const val = rest.join(':').trim()
    if (!key) continue
    if (key === 'to') out.to = val
    else if (key === 'memo') out.memo = val
  }
  return out
}

export async function txOrchestratorTick(): Promise<{ processed: number; succeeded: number; failed: number }> {
  // Find pending on-chain withdrawals
  const pendings = await prisma.botLedger.findMany({
    where: { type: 'WITHDRAW', status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 10,
    select: { id: true, botId: true, deltaNano: true, commentTag: true },
  })

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const p of pendings as unknown as PendingWithdrawal[]) {
    processed++
    const amountNano = (p.deltaNano as unknown as bigint) < 0n ? -(p.deltaNano as unknown as bigint) : 0n
    if (amountNano <= 0n) {
      await prisma.botLedger.update({ where: { id: p.id }, data: { status: 'FAILED', txHash: 'invalid-amount' } })
      failed++
      continue
    }
    const { to, memo } = parseCommentTag(p.commentTag)
    if (!to || !validateTonAddress(to)) {
      await prisma.botLedger.update({ where: { id: p.id }, data: { status: 'FAILED', txHash: 'invalid-destination' } })
      // Refund bot balance via compensating entry
      await prisma.bot.update({ where: { id: p.botId }, data: { tonBalanceNano: { increment: amountNano } } })
      await prisma.botLedger.create({
        data: {
          botId: p.botId,
          deltaNano: amountNano,
          type: 'WITHDRAW',
          status: 'CONFIRMED',
          commentTag: 'reversal:invalid-destination',
        },
      })
      failed++
      continue
    }
    try {
      const res = await sendTon({ to, amountNano, ...(memo ? { comment: memo } : {}) })
      const txRef = `seqno:${res.seqno}`
      await prisma.botLedger.update({ where: { id: p.id }, data: { status: 'CONFIRMED', txHash: txRef } })
      succeeded++
    } catch (e) {
      await prisma.botLedger.update({ where: { id: p.id }, data: { status: 'FAILED', txHash: 'send-error' } })
      // Refund on failure
      await prisma.bot.update({ where: { id: p.botId }, data: { tonBalanceNano: { increment: amountNano } } })
      await prisma.botLedger.create({
        data: {
          botId: p.botId,
          deltaNano: amountNano,
          type: 'WITHDRAW',
          status: 'CONFIRMED',
          commentTag: 'reversal:send-error',
        },
      })
      failed++
    }
  }

  return { processed, succeeded, failed }
}

import { eventHandler, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/auth'
import { getBotAddress } from '../../../services/ton'

export default eventHandler(async (event) => {
  const auth = requireAuth(event)
  // Find the caller's bot
  const bot = await prisma.bot.findUnique({ where: { ownerTgId: auth.tgid } })
  if (!bot) {
    throw createError({ statusCode: 404, statusMessage: 'Bot not found. Initialize your bot first.' })
  }
  const address = await getBotAddress()
  const depositComment = `BOT:${bot.id}`
  return {
    ok: true,
    bot: {
      id: bot.id,
      handle: bot.handle,
      balanceNano: bot.tonBalanceNano.toString(),
      balanceTon: (Number(bot.tonBalanceNano) / 1e9).toFixed(9)
    },
    deposit: { address, comment: depositComment }
  }
})


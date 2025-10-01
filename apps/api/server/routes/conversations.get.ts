import { eventHandler } from 'h3'
import { prisma } from '../utils/prisma'

export default eventHandler(async () => {
  const convos = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: {
      botA: { select: { id: true, handle: true } },
      botB: { select: { id: true, handle: true } },
      messages: { orderBy: { createdAt: 'asc' }, take: 50 },
    },
  })
  return { ok: true, conversations: convos }
})


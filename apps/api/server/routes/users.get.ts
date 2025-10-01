import { eventHandler } from 'h3'
import { prisma } from '../utils/prisma'

export default eventHandler(async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  return { users }
})


import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { validateTonAddress } from '../../services/ton'

export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    event.node.res.setHeader('Allow', 'POST')
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }
  const auth = requireAuth(event)
  const body = await readBody<{ address?: string }>(event)
  const address = (body?.address || '').trim()
  if (!address) throw createError({ statusCode: 400, statusMessage: 'address is required' })
  if (!validateTonAddress(address)) throw createError({ statusCode: 400, statusMessage: 'Invalid TON address' })

  const user = await prisma.user.update({ where: { id: auth.userId }, data: { walletAddressTon: address, walletLinkedAt: new Date() } })
  return { ok: true, address: user.walletAddressTon }
})


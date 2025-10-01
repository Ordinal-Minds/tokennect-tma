import { eventHandler, createError } from 'h3'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../utils/auth'

function toDto(token: any, basePrefix: string = '') {
  if (!token) return null
  const imageRel = token.imagePath.startsWith('/') ? token.imagePath : `/${token.imagePath}`
  return {
    id: token.id,
    ownerTgId: token.ownerTgId,
    name: token.name,
    symbol: token.symbol,
    description: token.description ?? null,
    chainAddress: token.chainAddress,
    hardCapTier: token.hardCapTier,
    timeLimitDays: token.timeLimitDays,
    totalSupply: typeof token.totalSupply === 'bigint' ? token.totalSupply.toString() : String(token.totalSupply),
    imagePath: imageRel,
    imageUrl: `${basePrefix}/uploads${imageRel}`.replace(/\/\/+/, '/'),
    createdAt: token.createdAt.toISOString(),
    updatedAt: token.updatedAt.toISOString(),
  }
}

export default eventHandler(async (event) => {
  const { tgid } = requireAuth(event)

  // Derive API base prefix (e.g., '/api') if present
  const pathname = new URL(event.node.req.url || '/', 'http://local').pathname
  const basePrefix = pathname.startsWith('/api/') || pathname === '/api' ? '/api' : ''

  const token = await prisma.token.findUnique({ where: { ownerTgId: tgid } }).catch((e) => {
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  })

  if (!token) return { ok: true, token: null }
  return { ok: true, token: toDto(token, basePrefix) }
})

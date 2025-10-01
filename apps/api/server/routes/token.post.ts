import { eventHandler, createError } from 'h3'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../utils/auth'
import path from 'node:path'
import fs from 'node:fs/promises'
import fscb from 'node:fs'
import formidable from 'formidable'

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads')

function assertNonEmpty(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: `${field} is required` })
  }
}

function sanitizeSymbol(sym: string): string {
  let s = sym.trim().toUpperCase()
  if (!/^[A-Z0-9]{1,10}$/.test(s)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid symbol (A-Z0-9, max 10)' })
  }
  return s
}

function generateTonPlaceholderAddress(ownerTgId: string, symbol: string): string {
  // Placeholder TON-friendly address string. Real implementation would deploy and return actual address.
  // Using a deterministic-ish fake for local dev visibility.
  const base = Buffer.from(`${ownerTgId}:${symbol}:${Date.now()}`).toString('base64url')
  // TON user-friendly addresses often start with 'EQ'. We'll mimic that.
  return `EQ${base.slice(0, 46)}`
}

export default eventHandler(async (event) => {
  const { tgid } = requireAuth(event)

  const existing = await prisma.token.findUnique({ where: { ownerTgId: tgid } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Token already exists for this user' })
  }

  // Parse multipart form
  const form = formidable({ multiples: false, keepExtensions: true })
  const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(event.node.req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  }).catch((e) => {
    throw createError({ statusCode: 400, statusMessage: 'Invalid form data' })
  })

  const name = String(fields.name || '')
  const symbolRaw = String(fields.symbol || '')
  const description = fields.description ? String(fields.description) : null
  const hardCapTier = String(fields.hardCapTier || '') as any
  const timeLimitDays = Number(fields.timeLimitDays || fields.timeLimit || 30)
  const totalSupplyStr = String(fields.totalSupply || '1000000000')

  assertNonEmpty(name, 'name')
  assertNonEmpty(symbolRaw, 'symbol')
  assertNonEmpty(hardCapTier, 'hardCapTier')
  if (![ 'TON_50', 'TON_200', 'TON_500', 'TON_1000', 'TON_5000' ].includes(hardCapTier)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid hardCapTier' })
  }
  if (![30, 60, 90].includes(timeLimitDays)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid timeLimitDays' })
  }
  const symbol = sanitizeSymbol(symbolRaw)
  if (!/^\d+$/.test(totalSupplyStr)) {
    throw createError({ statusCode: 400, statusMessage: 'totalSupply must be an integer' })
  }

  // Handle image file
  const image = (files.image || files.file || files.photo) as formidable.File | formidable.File[] | undefined
  let imageFile: formidable.File | undefined
  if (Array.isArray(image)) imageFile = image[0]
  else imageFile = image
  if (!imageFile || !imageFile.filepath) {
    throw createError({ statusCode: 400, statusMessage: 'image is required' })
  }

  // Ensure upload directory
  const userDir = path.join(UPLOAD_ROOT, 'tokens', tgid)
  await fs.mkdir(userDir, { recursive: true })

  // Persist image
  const ext = (path.extname(imageFile.originalFilename || '') || '.png').toLowerCase()
  const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png'
  const finalName = `image${safeExt}`
  const finalPath = path.join(userDir, finalName)
  await fs.copyFile(imageFile.filepath, finalPath)

  // Tighten permissions (best-effort)
  try { fscb.chmodSync(finalPath, 0o644) } catch {}

  const imageRelPath = path.posix.join('tokens', tgid, finalName)

  const created = await prisma.token.create({
    data: {
      ownerTgId: tgid,
      name,
      symbol,
      description,
      imagePath: imageRelPath,
      chainAddress: generateTonPlaceholderAddress(tgid, symbol),
      hardCapTier,
      timeLimitDays,
      totalSupply: BigInt(totalSupplyStr),
    }
  })

  // Respond with dto
  const pathname = new URL(event.node.req.url || '/', 'http://local').pathname
  const basePrefix = pathname.startsWith('/api/') || pathname === '/api' ? '/api' : ''
  return {
    ok: true,
    token: {
      id: created.id,
      ownerTgId: created.ownerTgId,
      name: created.name,
      symbol: created.symbol,
      description: created.description,
      hardCapTier: created.hardCapTier,
      timeLimitDays: created.timeLimitDays,
      totalSupply: created.totalSupply.toString(),
      chainAddress: created.chainAddress,
      imagePath: `/${imageRelPath}`,
      imageUrl: `${basePrefix}/uploads/${imageRelPath}`.replace(/\/\/+/, '/'),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    }
  }
})

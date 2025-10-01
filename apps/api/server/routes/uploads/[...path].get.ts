import { eventHandler, createError, sendStream } from 'h3'
import path from 'node:path'
import fs from 'node:fs'

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads')

export default eventHandler(async (event) => {
  const p = event.context.params?.path
  const rel = Array.isArray(p) ? p.join('/') : String(p || '')
  // Prevent path traversal
  const safeRel = rel.replace(/\.\.+/g, '')
  const abs = path.join(UPLOAD_ROOT, safeRel)
  if (!abs.startsWith(UPLOAD_ROOT)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const exists = fs.existsSync(abs)
  if (!exists || !fs.statSync(abs).isFile()) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const stream = fs.createReadStream(abs)
  return sendStream(event, stream)
})


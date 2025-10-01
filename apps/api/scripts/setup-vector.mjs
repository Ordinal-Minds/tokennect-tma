import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Ensure pgvector is available (safe if already installed)
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')

  // Make sure the column exists (db push creates it). If not, add it now.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "publicEmbedding" vector'
  )

  // Set desired dimension for the embedding column (adjust if you change model dims)
  const dimension = parseInt(process.env.VECTOR_DIM || '1536', 10)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Bot" ALTER COLUMN "publicEmbedding" TYPE vector(${dimension})`
  )

  // Build an IVFFLAT index with cosine distance for fast ANN search
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS bot_public_embedding_ivfflat ON "Bot" USING ivfflat ("publicEmbedding" vector_cosine_ops) WITH (lists = 100)'
  )
}

main()
  .catch((e) => {
    console.error('[setup-vector] Error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Ensure pgvector is enabled in the current database
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


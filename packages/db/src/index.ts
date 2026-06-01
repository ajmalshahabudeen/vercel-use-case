/**
 * Shared Prisma Client instance for the monorepo.
 *
 * Uses the modern "prisma-client" generator output.
 * Import from here in apps and other packages:
 *   import { prisma, PrismaClient } from '@workspace/db'
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/prisma/client.js'

// Learn more about instantiating Prisma Client with driver adapters:
// https://pris.ly/d/driver-adapters

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.warn(
      '[ @workspace/db ] DATABASE_URL is not set. Prisma Client will fail to connect.'
    )
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Re-export useful types and the client constructor
export { PrismaClient, Prisma } from '../generated/prisma/client.js'
export type { PrismaClient as PrismaClientType } from '../generated/prisma/client.js'

// Default export for convenience
export default prisma

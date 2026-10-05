import { PrismaClient } from '@prisma/client'

// Database configuration — auto-detect from DATABASE_URL env var.
// - Vercel/Production: set DATABASE_URL to postgresql://... (Supabase)
// - Local dev: set DATABASE_URL to file:./db/custom.db (SQLite)
//
// This file supports BOTH SQLite and PostgreSQL without code changes.
// The provider in prisma/schema.prisma must match the actual database.

const dbUrl = process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

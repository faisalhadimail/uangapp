import { PrismaClient } from '@prisma/client'

// Force Supabase PostgreSQL URL — override any stale shell env var.
// The shell environment may still have DATABASE_URL=file:... from old SQLite setup,
// which causes "URL must start with postgresql://" errors.
const SUPABASE_URL =
  process.env.DATABASE_URL?.startsWith('postgresql://') ||
  process.env.DATABASE_URL?.startsWith('postgres://')
    ? process.env.DATABASE_URL
    : 'postgresql://postgres.ffueazsumecsyhmjexbu:YiSIBTnU6v030Bw2@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: SUPABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

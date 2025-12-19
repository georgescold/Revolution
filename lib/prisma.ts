import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Hardcoded fallback because .env is failing to load in this dev environment
const dbUrl = "postgresql://postgres:!YEYEyaya02@db.uasiwkigyrrvcebnxdjb.supabase.co:5432/postgres";

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

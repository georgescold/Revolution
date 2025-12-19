import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

console.log("----------------------------------------------------------------")
console.log("DEBUG PRISMA INIT (with dotenv)")
console.log("Checking process.env.DATABASE_URL:", process.env.DATABASE_URL ? "Defined (Length: " + process.env.DATABASE_URL.length + ")" : "UNDEFINED")
console.log("----------------------------------------------------------------")

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

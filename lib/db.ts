import { PrismaClient } from "@prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"], // Logs database queries for debugging
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
  console.log("Database connection initialized")
}


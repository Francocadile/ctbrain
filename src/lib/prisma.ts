// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton para evitar múltiples conexiones en dev/hot-reload.
 * En producción, Vercel crea instancias efímeras por request; esto es seguro.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

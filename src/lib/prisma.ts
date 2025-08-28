// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Evita múltiples instancias en dev/hot-reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export default + named para soportar ambos estilos de import
export default prisma;

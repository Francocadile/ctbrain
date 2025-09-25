// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Evita múltiples instancias en dev (HMR)
const globalForPrisma = global as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Guarda la instancia en dev
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

// ⬇️ Export por defecto para compatibilidad con: import prisma from "@/lib/prisma"
export default prisma;

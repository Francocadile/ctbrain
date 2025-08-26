// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // Evita instancias duplicadas en dev (hot reload)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

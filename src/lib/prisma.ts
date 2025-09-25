// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reutiliza la instancia en dev para evitar demasiadas conexiones
export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// ✅ Export default + named para que funcionen ambos estilos de import
export default prisma;

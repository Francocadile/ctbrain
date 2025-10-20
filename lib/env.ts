// src/lib/env.ts
// Shim simple de variables de entorno separadas por ámbito.
// Evita depender de tipos externos y mantiene defaults seguros.

export const env = {
  server: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL, // opcional
  },
  client: {
    // Feature flags del lado cliente (public)
    NEXT_PUBLIC_FLAG_EXERCISES:
      process.env.NEXT_PUBLIC_FLAG_EXERCISES ?? "false",
    NEXT_PUBLIC_FLAG_VIDEOS:
      process.env.NEXT_PUBLIC_FLAG_VIDEOS ?? "false",
    NEXT_PUBLIC_FLAG_REPORTS:
      process.env.NEXT_PUBLIC_FLAG_REPORTS ?? "false",
  },
} as const;

// src/lib/env.ts

type NodeEnv = "development" | "test" | "production";

type ClientEnv = {
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PUBLIC_FLAG_EXERCISES: boolean;
  NEXT_PUBLIC_FLAG_VIDEOS: boolean;
  NEXT_PUBLIC_FLAG_REPORTS: boolean;
};

type ServerEnv = {
  DATABASE_URL: string;
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  NODE_ENV: NodeEnv;
};

const toBool = (v?: string) => v === "true" || v === "1";

/**
 * ÚNICA fuente de variables de entorno dentro de la app.
 * - client: solo claves NEXT_PUBLIC_ (seguras para el browser)
 * - server: solo en el servidor
 */
export const env: { client: ClientEnv; server: ServerEnv } = {
  client: {
    NEXT_PUBLIC_APP_NAME:
      process.env.NEXT_PUBLIC_APP_NAME ?? "CTBrain",
    NEXT_PUBLIC_FLAG_EXERCISES: toBool(
      process.env.NEXT_PUBLIC_FLAG_EXERCISES
    ),
    NEXT_PUBLIC_FLAG_VIDEOS: toBool(
      process.env.NEXT_PUBLIC_FLAG_VIDEOS
    ),
    NEXT_PUBLIC_FLAG_REPORTS: toBool(
      process.env.NEXT_PUBLIC_FLAG_REPORTS
    ),
  },
  server: {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me",
    NODE_ENV: (process.env.NODE_ENV as NodeEnv) ?? "development",
  },
};

export type { ClientEnv, ServerEnv };

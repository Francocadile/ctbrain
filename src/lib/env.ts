// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET es obligatorio"),
  // En Vercel suele venir seteada; local puede quedar vacía sin romper
  NEXTAUTH_URL: z.string().url().optional().or(z.literal("")),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const rawEnv = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

export const env = envSchema.parse(rawEnv);

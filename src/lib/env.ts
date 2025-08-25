import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_FLAG_EXERCISES: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_FLAG_VIDEOS: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_FLAG_REPORTS: z.enum(["true", "false"]).default("true")
});

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const env = {
  client: clientSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_FLAG_EXERCISES: process.env.NEXT_PUBLIC_FLAG_EXERCISES ?? "true",
    NEXT_PUBLIC_FLAG_VIDEOS: process.env.NEXT_PUBLIC_FLAG_VIDEOS ?? "true",
    NEXT_PUBLIC_FLAG_REPORTS: process.env.NEXT_PUBLIC_FLAG_REPORTS ?? "true"
  }),
  server: serverSchema.parse({
    NODE_ENV: process.env.NODE_ENV ?? "development"
  })
};

import { env } from "./env";

export const flags = {
  exercises: env.client.NEXT_PUBLIC_FLAG_EXERCISES === "true",
  videos: env.client.NEXT_PUBLIC_FLAG_VIDEOS === "true",
  reports: env.client.NEXT_PUBLIC_FLAG_REPORTS === "true"
};

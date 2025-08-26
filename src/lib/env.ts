// Valida y expone variables de entorno
const required = (val: string | undefined, key: string) => {
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
};

export const env = {
  server: {
    DATABASE_URL: required(process.env.DATABASE_URL, "DATABASE_URL"),
    NEXTAUTH_SECRET: required(process.env.NEXTAUTH_SECRET, "NEXTAUTH_SECRET"),
    NEXTAUTH_URL: required(process.env.NEXTAUTH_URL, "NEXTAUTH_URL")
  },
  client: {
    NEXT_PUBLIC_APP_NAME: required(
      process.env.NEXT_PUBLIC_APP_NAME,
      "NEXT_PUBLIC_APP_NAME"
    )
  }
} as const;

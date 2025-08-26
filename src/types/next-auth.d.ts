// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
  }
}

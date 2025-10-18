import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
      isApproved?: boolean;
      teamId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";
    isApproved?: boolean;
    teamId?: string | null;
  }
}

export {};

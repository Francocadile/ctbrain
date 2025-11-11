// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | "SUPERADMIN";
      // Multi-team support (opcional)
      teamIds?: string[];
      currentTeamId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role | "SUPERADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role | "SUPERADMIN";
    // arrays opcionales con los equipos a los que pertenece el usuario
    teamIds?: string[];
    currentTeamId?: string | null;
  }
}

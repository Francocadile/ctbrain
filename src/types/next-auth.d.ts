// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | "SUPERADMIN";
      isApproved: boolean | null;
      // Multi-team support (opcional)
      teamIds: string[];
      currentTeamId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role | "SUPERADMIN";
    isApproved?: boolean | null;
    teamIds?: string[];
    currentTeamId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role | "SUPERADMIN";
    isApproved?: boolean | null;
    // arrays opcionales con los equipos a los que pertenece el usuario
    teamIds?: string[];
    currentTeamId?: string | null;
    passwordChangedAt?: number;
  }
}

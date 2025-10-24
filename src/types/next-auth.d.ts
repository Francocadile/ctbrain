import { DefaultSession } from "next-auth";

/** Roles conocidos hoy (string union mientras el schema use String) */
export type AppRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "CT"
  | "MEDICO"
  | "JUGADOR"
  | "DIRECTIVO"
  | "USER"
  | "user";

/** Extiende Session y User para incluir id/role/teamId */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      teamId?: string | null;
      approved?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: AppRole;
    teamId?: string | null;
    approved?: boolean;
  }
}

/** Extiende el JWT con los mismos campos */
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    teamId?: string | null;
    approved?: boolean;
  }
}

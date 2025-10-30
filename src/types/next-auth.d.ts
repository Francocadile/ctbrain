// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | "SUPERADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role | "SUPERADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
  }
}

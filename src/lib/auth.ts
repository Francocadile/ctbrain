// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CTB-BASE-12 | FASE 1
 * authorize simple — solo valida email existente (sin hash)
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email) return null;

        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;

        // FASE 1: no verifica password
        // FASE 2.3: se reemplazará por bcrypt.compare
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          name: user.name,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
};

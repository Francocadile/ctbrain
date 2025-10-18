// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

/**
 * CTB-BASE-12 | FASE 1
 * - authorize simple: valida que el email exista (sin hash)
 * - callbacks jwt/session: inyectan id, role, isApproved y teamId (si único equipo)
 * - no se crean nuevos PrismaClient dentro de callbacks
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }, // mostrado pero NO validado en Fase 1
      },
      async authorize(creds) {
        const email = creds?.email?.toLowerCase().trim();
        const password = creds?.password || "";
        if (!email) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Si hay password hasheada en DB, verificamos
        if (user.password) {
          const ok = await compare(password, user.password);
          if (!ok) return null;
        } else {
          // Si no hay password seteada, admitimos login solo si password viene vacío
          if (password) return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // user solo existe en el primer login
      if (user) {
        const u = user as any;
        (token as any).id = u.id;
        (token as any).role = u.role;
        (token as any).isApproved = u.isApproved;

        try {
          const memberships = await prisma.userTeam.findMany({
            where: { userId: u.id as string },
            select: { teamId: true },
          });
          if (u.isApproved === true && memberships.length === 1) {
            (token as any).teamId = memberships[0].teamId;
          } else {
            (token as any).teamId = undefined;
          }
        } catch {
          (token as any).teamId = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role;
        (session.user as any).isApproved = (token as any).isApproved;
        (session.user as any).teamId = (token as any).teamId;
      }
      return session;
    },
  },
};

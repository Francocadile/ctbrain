// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CTB-BASE-12 | FASE 1
 * - authorize simple: solo valida que el email exista (sin hash)
 * - callbacks jwt/session: inyectan id, role, isApproved en la sesión
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
        const email = (creds?.email || "").trim().toLowerCase();
        const password = (creds?.password || "").trim();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          isApproved: user.isApproved,
        } as any;
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    // Guarda role/isApproved/teamId en el token JWT
      async jwt({ token, user }) {
        if (user) {
          // @ts-ignore
          token.role = (user as any).role;
          // @ts-ignore
          token.isApproved = (user as any).isApproved;

          // Buscar teamId del modelo UserTeam donde el usuario esté aprobado
          try {
            const userId = (user as any).id as string;
            const memberships = await prisma.userTeam.findMany({
              where: { userId },
              select: { teamId: true },
            });
            if ((user as any).isApproved === true && memberships.length === 1) {
              // @ts-ignore
              token.teamId = memberships[0].teamId;
            } else {
              // @ts-ignore
              token.teamId = undefined;
            }
          } catch {
            // @ts-ignore
            token.teamId = undefined;
          }
        }
        return token;
    },

    // Restaura id/role/isApproved/teamId en session.user para tu app
    async session({ session, token }) {
      // @ts-ignore
      session.user = session.user || {};
      // @ts-ignore
      session.user.id = token.sub as string;
      // @ts-ignore
      session.user.role = (token as any).role;
      // @ts-ignore
      session.user.isApproved = (token as any).isApproved;
      // @ts-ignore
      session.user.teamId = (token as any).teamId ?? null;
      return session;
    },
  },
};

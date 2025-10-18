// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

// Prisma: una sola instancia global
const prisma = new PrismaClient();

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
        const email = creds?.email?.toString().trim().toLowerCase();
        if (!email) return null;

        // FASE 1: login simple por existencia de email (sin validar password)
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, role: true, isApproved: true },
        });
        if (!user) return null;

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
    async jwt({ token, user }) {
      // En el primer login, copiamos campos desde "user" (lo que retorna authorize)
      if (user) {
        const u = user as any;
        (token as any).role = u.role;
        (token as any).isApproved = u.isApproved;

        // teamId por defecto: si el usuario aprobado pertenece a 1 solo equipo
        try {
          const userId = u.id as string;
          const memberships = await prisma.userTeam.findMany({
            where: { userId },
            select: { teamId: true },
          });
          if (u.isApproved === true && memberships.length === 1) {
            (token as any).teamId = memberships[0].teamId;
          } else {
            (token as any).teamId = undefined; // el front deberá elegir (selector de equipo)
          }
        } catch {
          (token as any).teamId = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // id (NextAuth guarda el id en token.sub)
        (session.user as any).id = (token.sub as string) ?? (session.user as any).id;

        // role, isApproved, teamId desde el token
        (session.user as any).role = (token as any).role;
        (session.user as any).isApproved = (token as any).isApproved;
        (session.user as any).teamId = (token as any).teamId;
      }
      return session;
    },
  },
};

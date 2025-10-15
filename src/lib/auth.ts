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
        if (!email) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // DEV-ONLY: permitir login por email si ENV está activo
        if (process.env.ALLOW_EMAIL_LOGIN === "1") {
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
            role: user.role,
            isApproved: user.isApproved,
          } as any;
        }

        // Camino normal con bcrypt
        if (!password || !user.password) return null;
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
        const prisma = new PrismaClient();
        const userTeams = await prisma.userTeam.findMany({
          where: { userId: user.id },
          select: { teamId: true, user: { select: { isApproved: true } } },
        });
        const approvedTeams = userTeams.filter(ut => ut.user.isApproved);
        if (approvedTeams.length === 1) {
          // Un solo equipo aprobado: usar ese
          // @ts-ignore
          token.teamId = approvedTeams[0].teamId;
        } else {
          // Varios equipos aprobados o ninguno: dejar vacío para que el frontend elija
          // @ts-ignore
          token.teamId = null;
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

// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

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
        const password = (creds?.password || "").toString();
        if (!email) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isApproved: true,
            passwordHash: true,
          },
        });
        if (!user) return null;

        if (user.passwordHash) {
          const ok = await bcryptjs.compare(password, user.passwordHash);
          if (!ok) return null;
        } else if (process.env.NODE_ENV !== "development") {
          return null;
        }

        // Buscar equipos del usuario
        const userTeams = await prisma.userTeam.findMany({
          where: { userId: user.id },
          select: { teamId: true },
        });
        const teamIds = userTeams.map((ut) => ut.teamId);
        const currentTeamId = teamIds.length > 0 ? teamIds[0] : null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          isApproved: user.isApproved,
          teamIds,
          currentTeamId,
        } as any;
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    // Guarda role/isApproved en el token JWT
    async jwt({ token, user }) {
      if (user) {
        const {
          role,
          isApproved,
          teamIds = [],
          currentTeamId = null,
        } = user as any;
        token.role = role;
        token.isApproved = isApproved;
        token.teamIds = teamIds;
        // Si no hay currentTeamId pero hay teamIds, asignar el primero
        token.currentTeamId = currentTeamId ?? (teamIds.length > 0 ? teamIds[0] : null);
      } else {
        token.teamIds = (token.teamIds as string[] | undefined) ?? [];
        token.currentTeamId =
          (token.currentTeamId as string | null | undefined) ?? null;
      }
      return token;
    },

    // Restaura id/role/isApproved en session.user para tu app
    async session({ session, token }) {
      // @ts-ignore
      session.user = session.user || {};
      // @ts-ignore
      session.user.id = token.sub as string;
      // @ts-ignore
      session.user.role = (token as any).role;
      // @ts-ignore
      session.user.isApproved = (token as any).isApproved ?? null;
      const teamIds = Array.isArray((token as any).teamIds)
        ? ((token as any).teamIds as string[])
        : [];
      // @ts-ignore
      session.user.teamIds = teamIds;
      // @ts-ignore
      session.user.currentTeamId = (token as any).currentTeamId ?? null;
      return session;
    },
  },
};

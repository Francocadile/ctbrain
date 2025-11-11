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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Seguridad: si el usuario tiene password en la DB, validar con bcrypt.
        // Si no tiene password (legacy), solo permitir en entorno de desarrollo
        // para facilitar testing; en producción DENEGAR acceso sin password.
        if (user.password) {
          const match = await bcryptjs.compare(password, user.password);
          if (!match) return null;
        } else {
          // Permitir solo en development para compatibilidad con seeds antiguos.
          if (process.env.NODE_ENV !== "development") return null;
        }

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
    // Guarda role/isApproved en el token JWT
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.role = (user as any).role;
        // @ts-ignore
        token.isApproved = (user as any).isApproved;
        // Si `authorize` devuelve team info en el futuro, preservarla en el token
        // @ts-ignore
        if ((user as any).teamIds) token.teamIds = (user as any).teamIds;
        // @ts-ignore
        if ((user as any).currentTeamId) token.currentTeamId = (user as any).currentTeamId;
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
      session.user.isApproved = (token as any).isApproved;
      // Restaurar teamIds/currentTeamId si existen en el token
      // @ts-ignore
      if ((token as any).teamIds) session.user.teamIds = (token as any).teamIds;
      // @ts-ignore
      if ((token as any).currentTeamId) session.user.currentTeamId = (token as any).currentTeamId;
      return session;
    },
  },
};

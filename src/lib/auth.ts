import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
        // Login simple: si existe el usuario por email, lo dejamos pasar.
        // (Tu validación real de password la podés agregar cuando quieras)
        const user = await prisma.user.findUnique({
          where: { email: creds.email },
          select: { id: true, name: true, email: true, role: true, isApproved: true },
        });
        if (!user) return null;
        return { id: user.id, name: user.name ?? user.email, email: user.email, role: user.role, isApproved: user.isApproved };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primer login
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        (token as any).isApproved = (user as any).isApproved ?? false;
        return token;
      }
      // Refresco: traigo estado actualizado (p.ej., si el Admin aprobó)
      if (token?.email) {
        try {
          const u = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, isApproved: true },
          });
          if (u) {
            token.id = u.id;
            token.role = u.role;
            (token as any).isApproved = u.isApproved;
          }
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user ?? {}),
        id: token.id as string,
        role: token.role as string,
        isApproved: (token as any).isApproved ?? false,
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};

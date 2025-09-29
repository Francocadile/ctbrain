// src/lib/auth.ts
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
        // Login “soft”: busca por email
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        // Devuelvo lo mínimo; el resto lo completa el callback jwt con lectura a DB
        return { id: user.id, name: user.name ?? user.email, email: user.email, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // En el primer login (cuando viene "user") refresco desde DB y guardo role + isApproved
      if (user?.id || user?.email) {
        const dbUser =
          (user?.id
            ? await prisma.user.findUnique({ where: { id: (user as any).id } })
            : user?.email
            ? await prisma.user.findUnique({ where: { email: (user as any).email } })
            : null) as any;

        token.id = dbUser?.id ?? (user as any)?.id ?? token.id;
        token.role = dbUser?.role ?? (user as any)?.role ?? token.role;
        // <- puede no existir en tu schema aún; si no existe será undefined y no rompe
        token.isApproved = dbUser?.isApproved ?? token?.isApproved ?? true;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user ?? {}),
        id: token.id as string,
        role: token.role as string,
        isApproved: (token as any).isApproved,
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};

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
        // 🔐 Ajusta esto a tu login real
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        return { id: user.id, name: user.name ?? user.email, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user ?? {}),
        id: token.id as string,
        role: token.role as string,
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};

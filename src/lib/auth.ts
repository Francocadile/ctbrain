// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type RoleString = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

// Busca usuario por email (ajusta select a tu esquema real)
async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, password: true, role: true },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await findUserByEmail(credentials.email);
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: (user.role as unknown as RoleString) ?? undefined,
        } as {
          id: string;
          email?: string;
          name?: string;
          role?: RoleString;
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as { role?: RoleString }).role;
        if (role) (token as Record<string, unknown>).role = role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = (token as Record<
          string,
          unknown
        >).role as RoleString | undefined;
        (session.user as Record<string, unknown>).id = token.sub as
          | string
          | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// Export opcional por si necesitás crear handlers aquí
export const authHandler = NextAuth(authOptions);

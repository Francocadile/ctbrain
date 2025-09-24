// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

function isBcryptHash(s?: string | null) {
  return !!s && (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$"));
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        // ✅ Tu schema tiene 'password' (no 'passwordHash')
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,   // 'ADMIN' | 'CT' | 'MEDICO' | 'JUGADOR' | 'DIRECTIVO'
            password: true,
          },
        });
        if (!user) return null;

        const stored = user.password || "";
        let ok = false;

        // Si es un hash bcrypt, comparamos con bcrypt
        if (isBcryptHash(stored)) {
          ok = await compare(password, stored);
        } else {
          // Fallback: contraseña en texto (legacy/dev)
          ok = password === stored;
        }

        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name || "",
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = (token as any).role;
      return session;
    },
  },
};

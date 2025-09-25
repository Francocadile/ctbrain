// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" }, // nuestra pantalla propia

  providers: [
    CredentialsProvider({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,            // 'ADMIN' | 'CT' | 'MEDICO' | 'JUGADOR' | 'DIRECTIVO'
            password: true,        // texto plano (legacy/dev)
            passwordHash: true,    // bcrypt (si existe en tu esquema)
          },
        });

        if (!user) return null;

        // Acepta password plano (dev) o bcrypt
        const plainOk = !!user.password && credentials.password === user.password;
        let hashOk = false;
        if (user.passwordHash) {
          try { hashOk = await bcrypt.compare(credentials.password, user.passwordHash); } catch {}
        }
        if (!plainOk && !hashOk) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? user.email,
          role: user.role ?? "CT",
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role ?? token.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = (token as any).role;
      return session;
    },
  },
};

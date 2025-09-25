// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

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

        // 👇 Seleccionamos SOLO campos que existen en tu modelo
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,    // 'ADMIN' | 'CT' | 'MEDICO' | 'JUGADOR' | 'DIRECTIVO'
            password: true // texto plano (legacy/dev)
          },
        });

        if (!user) return null;

        // Validación simple (como venías usando): 123456 etc.
        const ok = !!user.password && credentials.password === user.password;
        if (!ok) return null;

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

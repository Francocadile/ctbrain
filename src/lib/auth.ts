import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: creds.email },
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

        // 1) Si hay hash, validar con bcrypt
        if (user.passwordHash) {
          const ok = await compare(creds.password, user.passwordHash);
          if (!ok) return null;
        } else if (user.password) {
          // 2) Fallback legacy: password en texto plano (solo para dev)
          if (creds.password !== user.password) return null;
        } else {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email || "",
          name: user.name || "",
          role: user.role || "JUGADOR",
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      (session as any).role = (token as any).role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

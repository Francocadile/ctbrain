// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

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

        // 👇 Ajustá campos según tu Prisma
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,          // 'ADMIN' | 'CT' | 'MEDICO' | 'JUGADOR' | 'DIRECTIVO'
            passwordHash: true,  // hash bcrypt
            // password: true,   // (opcional: legacy texto plano solo para dev)
          },
        });
        if (!user) return null;

        let ok = false;
        if (user.passwordHash) {
          ok = await compare(password, user.passwordHash);
        }

        // Fallback DEV (opcional). Activar con DEV_ALLOW_PLAINTEXT=1 si tenés legacy.
        // if (!ok && process.env.DEV_ALLOW_PLAINTEXT === "1" && (user as any).password) {
        //   ok = password === (user as any).password;
        // }

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

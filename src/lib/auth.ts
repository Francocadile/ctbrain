// src/lib/auth.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email || "").trim().toLowerCase();
        if (!email) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // FASE 1: NO verifica password. Solo existencia de email.
        // (Tus pantallas y seed actuales siguen andando.)
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
      return session;
    },
  },
};

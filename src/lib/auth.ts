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

        // ⚠️ Mantengo tu comportamiento actual (sin check de contraseña) para no romper nada.
        // Cuando quieras activar hash + verificación, lo hacemos sin cambiar el resto.
        const user = await prisma.user.findUnique({
          where: { email: creds.email.toLowerCase() },
        });
        if (!user) return null;

        return {
          id: user.id,
          name: user.name ?? user.email,
          email: user.email,
          role: user.role,
          // 👇 clave para aprobación por admin
          isApproved: user.isApproved,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.isApproved = (user as any).isApproved; // 👈 pasa al JWT
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user ?? {}),
        id: token.id as string,
        role: token.role as string,
        isApproved: (token as any).isApproved as boolean, // 👈 disponible en cliente/servidor
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};

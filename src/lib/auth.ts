// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function looksLikeBcrypt(hash?: string | null) {
  if (!hash) return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

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
        // Delay leve para homogeneizar timing
        await new Promise((r) => setTimeout(r, 250));

        const email = (creds?.email || "").trim().toLowerCase();
        const password = (creds?.password || "").trim();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isApproved: true,
            password: true,
          },
        });
        if (!user || !user.password) return null;

        // 1) Si ya es bcrypt -> comparar
        if (looksLikeBcrypt(user.password)) {
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;
        } else {
          // 2) Si está en texto plano y coincide -> migrar a bcrypt
          if (password !== user.password) return null;
          const newHash = await bcrypt.hash(password, 10);
          await prisma.user.update({ where: { email }, data: { password: newHash } });
        }

        return {
          id: user.id,
          name: user.name ?? user.email,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primer login
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).isApproved = (user as any).isApproved ?? false;
        token.email = (user as any).email ?? token.email;
        return token;
      }
      // Refresco: traigo estado actualizado (p. ej., si el Admin aprobó)
      if (token?.email) {
        try {
          const u = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, isApproved: true },
          });
          if (u) {
            (token as any).id = u.id;
            (token as any).role = u.role;
            (token as any).isApproved = u.isApproved;
          }
        } catch {
          // noop
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user ?? {}),
        id: (token as any).id as string,
        role: (token as any).role as string,
        isApproved: (token as any).isApproved ?? false,
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};

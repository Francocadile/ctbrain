// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

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
        const email = creds?.email?.toLowerCase().trim();
        const password = creds?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await compare(password, user.password);
        if (!ok) return null;

        // Opcional: si quisieras bloquear no aprobados (excepto superadmin)
        // if (!user.isApproved && user.role !== "SUPERADMIN") return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        (token as any).role = u.role;
        (token as any).isApproved = u.isApproved;

        try {
          const memberships = await prisma.userTeam.findMany({
            where: { userId: u.id as string },
            select: { teamId: true },
          });
          (token as any).teamId =
            u.isApproved === true && memberships.length === 1
              ? memberships[0].teamId
              : undefined;
        } catch {
          (token as any).teamId = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token as any).role;
        (session.user as any).isApproved = (token as any).isApproved;
        (session.user as any).teamId = (token as any).teamId;
      }
      return session;
    },
  },
};

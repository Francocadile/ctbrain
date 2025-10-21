import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

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
        const parsed = credsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user: any = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

  const stored: string | null = user.password ?? null;
        if (!stored) return null;

        let ok = false;
        try {
          ok = await bcrypt.compare(password, stored);
        } catch {
          ok = false;
        }

        if (!ok && password === stored) {
          const newHash = await bcrypt.hash(password, 10);
          if ("password" in user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { password: newHash },
            });
          }
          ok = true;
        }

        if (!ok) return null;
        if (user.isApproved === false) throw new Error("NOT_APPROVED");

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role ?? "JUGADOR",
          isApproved: user.isApproved ?? true,
          teamId: user.teamId ?? null,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u: any = user;
        // @ts-ignore
        token.role = u.role;
        // @ts-ignore
        token.isApproved = u.isApproved;
        // @ts-ignore
        token.teamId = u.teamId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = (token as any).role;
      (session.user as any).isApproved = (token as any).isApproved;
      (session.user as any).teamId = (token as any).teamId ?? null;
      return session;
    },
  },

  pages: { signIn: "/login" },
};

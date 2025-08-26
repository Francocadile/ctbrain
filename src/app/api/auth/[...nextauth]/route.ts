// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient, Role } from "@prisma/client";
import { compare } from "bcryptjs";

// ❗ Import RELATIVO (sin "@/")
import prismaSingleton from "../../../lib/prisma";

const prisma = (prismaSingleton as unknown as PrismaClient) || new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;

        // Devolvemos lo mínimo + role para el JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role as Role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore: extendemos el token con role
        token.role = (user as any).role ?? "JUGADOR";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore: agregamos id y role a session.user
        session.user.id = token.sub;
        // @ts-ignore
        session.user.role = (token as any).role ?? "JUGADOR";
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

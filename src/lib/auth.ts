import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Intenta validar contra bcrypt si el hash lo parece; cae a igualdad simple si no. */
let bcrypt: any = null;
try {
  // Evita romper el build si no está instalado.
  // Si tenés bcryptjs en package.json, se usará automáticamente.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  bcrypt = require("bcryptjs");
} catch {}

async function verifyPassword(input: string, stored?: string | null) {
  if (!stored) return true; // permite seeds sin password en dev
  const looksHashed = /^\$2[aby]\$/.test(stored);
  if (looksHashed) {
    if (!bcrypt) return false;
    try {
      return await bcrypt.compare(input, stored);
    } catch {
      return false;
    }
  }
  return input === stored;
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
        if (!creds?.email) return null;

        const email = String(creds.email).trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Verificación de contraseña (hash o texto plano de ser necesario)
        const ok = await verifyPassword(String(creds.password || ""), user.password);
        if (!ok) return null;

        // Aprobación: solo ADMIN puede entrar sin estar aprobado
        if (!user.isApproved && user.role !== "ADMIN") {
          // devolvemos null para que NextAuth marque el login como inválido
          return null;
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
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.isApproved = (user as any).isApproved ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        ...(session.user ?? {}),
        id: token.id as string,
        role: token.role as string,
        isApproved: Boolean(token.isApproved),
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

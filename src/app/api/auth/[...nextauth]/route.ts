// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ⚠️ Importante: NO exportamos nada más que GET/POST.
// Evitamos exportar "authOptions" para no romper los tipos de Next 14.

const handler = NextAuth({
  adapter: {
    // Prisma Adapter mínimo para sesiones JWT (no usa tablas de session)
    createUser: (data) => prisma.user.create({ data }),
    getUser: (id) => prisma.user.findUnique({ where: { id } }),
    getUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    updateUser: ({ id, ...data }) =>
      prisma.user.update({ where: { id }, data }),
    deleteUser: (id) => prisma.user.delete({ where: { id } }),
    // Como usamos JWT, estas no se usan pero NextAuth las pide:
    linkAccount: async () => undefined as any,
    unlinkAccount: async () => undefined as any,
    getSessionAndUser: async () => undefined as any,
    createSession: async () => undefined as any,
    updateSession: async () => undefined as any,
    deleteSession: async () => undefined as any,
    getUserByAccount: async () => null,
    createVerificationToken: async () => undefined as any,
    useVerificationToken: async () => undefined as any,
  } as any,

  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // El campo guardado en DB es "password"
        if (!user || !user.password) return null;

        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;

        // Devolvemos shape mínimo que NextAuth entiende; agregamos role para el JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role ?? "JUGADOR",
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // guardamos el rol en el token
        (token as any).role = (user as any).role ?? "JUGADOR";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role ?? "JUGADOR";
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };

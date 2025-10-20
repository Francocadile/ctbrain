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

  const stored: string | null = user.passwordHash ?? user.password ?? null;
  if (!stored) return null;

  // 1) bcrypt compare
  let ok = false;
  try { ok = await bcrypt.compare(password, stored); } catch { ok = false; }

  // 2) migración silenciosa si estaba en texto plano
        if (!ok && password === stored) {
          const newHash = await bcrypt.hash(password, 10);
          if ("passwordHash" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
          } else if ("password" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { password: newHash } });
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
        token.role = u.role;
        token.isApproved = u.isApproved;
        token.teamId = u.teamId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
  (session.user as any).role = token.role;
  (session.user as any).isApproved = token.isApproved;
  (session.user as any).teamId = token.teamId ?? null;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

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

        // Detectar hash/contraseña
        const stored = user.passwordHash ?? user.password ?? null;
        if (!stored) return null;

        // 1) Intento con bcrypt
        let ok = false;
        try { ok = await bcrypt.compare(password, stored); } catch { ok = false; }

        // 2) Migración silenciosa si estaba en texto plano
        if (!ok && password === stored) {
          const newHash = await bcrypt.hash(password, 10);
          if ("passwordHash" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } as any });
          } else if ("password" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { password: newHash } as any });
          }
          ok = true;
        }

        if (!ok) return null;

        if (user.isApproved === false) {
          // mensaje manejable en UI
          throw new Error("NOT_APPROVED");
        }

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
        token.role = u.role;
        token.isApproved = u.isApproved;
        token.teamId = u.teamId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).isApproved = token.isApproved;
      (session.user as any).teamId = token.teamId ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

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

        // Detectar hash/contraseña
        const stored = user.passwordHash ?? user.password ?? null;
        if (!stored) return null;

        // 1) Intento con bcrypt
        let ok = false;
        try { ok = await bcrypt.compare(password, stored); } catch { ok = false; }

        // 2) Migración silenciosa si estaba en texto plano
        if (!ok && password === stored) {
          const newHash = await bcrypt.hash(password, 10);
          if ("passwordHash" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } as any });
          } else if ("password" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { password: newHash } as any });
          }
          ok = true;
        }

        if (!ok) return null;

        if (user.isApproved === false) {
          // mensaje manejable en UI
          throw new Error("NOT_APPROVED");
        }

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
        token.role = u.role;
        token.isApproved = u.isApproved;
        token.teamId = u.teamId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).isApproved = token.isApproved;
      (session.user as any).teamId = token.teamId ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs"; // Commented out to avoid duplication
import { z } from "zod";

const prisma = new PrismaClient();

const credsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

// Removed duplicate authOptions implementation
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

        // Detectar hash/contraseña
        const stored = user.passwordHash ?? user.password ?? null;
        if (!stored) return null;

        // 1) Intento con bcrypt
        let ok = false;
        try { ok = await bcrypt.compare(password, stored); } catch { ok = false; }

        // 2) Migración silenciosa si estaba en texto plano
        if (!ok && password === stored) {
          const newHash = await bcrypt.hash(password, 10);
          if ("passwordHash" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } as any });
          } else if ("password" in user) {
            await prisma.user.update({ where: { id: user.id }, data: { password: newHash } as any });
          }
          ok = true;
        }

        if (!ok) return null;

        if (user.isApproved === false) {
          // mensaje manejable en UI
          throw new Error("NOT_APPROVED");
        }

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
        token.role = u.role;
        token.isApproved = u.isApproved;
        token.teamId = u.teamId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).isApproved = token.isApproved;
      (session.user as any).teamId = token.teamId ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CTB-BASE-12 | FASE 1
 * - authorize simple: solo valida que el email exista (sin hash)
 * - callbacks jwt/session: inyectan id, role, isApproved en la sesión
 */
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
        const email = (creds?.email || "").trim().toLowerCase();
        const password = (creds?.password || "").trim();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

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

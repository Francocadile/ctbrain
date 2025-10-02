// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function looksLikeBcrypt(hash?: string | null) {
  if (!hash) return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

async function roleHome(role?: string) {
  switch (role) {
    case "ADMIN": return "/admin";
    case "CT": return "/ct";
    case "MEDICO": return "/medico"; // tu mapping actual
    case "JUGADOR": return "/jugador";
    case "DIRECTIVO": return "/directivo";
    default: return "/login";
  }
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

        // === Bootstrap Admin General ===
        const defaultEmail = (process.env.DEFAULT_ADMIN_EMAIL || "").trim().toLowerCase();
        const defaultPass  = process.env.DEFAULT_ADMIN_PASSWORD || "";

        if (defaultEmail && defaultPass && email === defaultEmail) {
          const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

          if (adminCount === 0) {
            const hash = await bcrypt.hash(defaultPass, 10);
            const existing = await prisma.user.findUnique({ where: { email: defaultEmail } });

            const admin = existing
              ? await prisma.user.update({
                  where: { email: defaultEmail },
                  data: {
                    role: "ADMIN",
                    isApproved: true,
                    mustChangePassword: true,
                    password: hash,
                    name: existing.name ?? "Administrador",
                  },
                  select: { id: true, name: true, email: true, role: true, isApproved: true, mustChangePassword: true },
                })
              : await prisma.user.create({
                  data: {
                    email: defaultEmail,
                    name: "Administrador",
                    role: "ADMIN",
                    isApproved: true,
                    mustChangePassword: true,
                    password: hash,
                  },
                  select: { id: true, name: true, email: true, role: true, isApproved: true, mustChangePassword: true },
                });

            return {
              id: admin.id,
              name: admin.name ?? admin.email,
              email: admin.email,
              role: admin.role,
              isApproved: admin.isApproved,
              mustChangePassword: admin.mustChangePassword,
              home: await roleHome(admin.role),
            } as any;
          }
          // Si ya hay admin, NO permitimos usar el admin general.
          // Se sigue por el flujo normal (credenciales de ese usuario, si existe).
        }

        // === Login normal con migración silenciosa de plaintext ===
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isApproved: true,
            mustChangePassword: true,
            password: true,
          },
        });
        if (!user || !user.password) return null;

        if (looksLikeBcrypt(user.password)) {
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;
        } else {
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
          mustChangePassword: user.mustChangePassword ?? false,
          home: await roleHome(user.role),
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
        (token as any).isApproved = (user as any).isApproved ?? false;
        (token as any).mustChangePassword = (user as any).mustChangePassword ?? false;
        token.email = (user as any).email ?? token.email;
        return token;
      }
      if (token?.email) {
        try {
          const u = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, isApproved: true, mustChangePassword: true },
          });
          if (u) {
            (token as any).id = u.id;
            (token as any).role = u.role;
            (token as any).isApproved = u.isApproved;
            (token as any).mustChangePassword = u.mustChangePassword ?? false;
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
        mustChangePassword: (token as any).mustChangePassword ?? false,
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};

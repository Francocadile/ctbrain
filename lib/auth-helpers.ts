// src/lib/auth-helpers.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function requireSessionWithRoles(roles: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Response("No autenticado", { status: 401 });
  }
  const role = session.user.role as Role | undefined;
  if (!role || !roles.includes(role)) {
    throw new Response("No autorizado", { status: 403 });
  }
  return session;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Response("No autenticado", { status: 401 });
  }
  return session;
}

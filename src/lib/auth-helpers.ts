import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ajustá si tu archivo es otro
import { Role } from "@prisma/client";

export async function requireSessionWithRoles(roles: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Response("Unauthorized", { status: 401 });
  const role = (session.user as any).role as Role | undefined;
  if (!role || !roles.includes(role)) throw new Response("Forbidden", { status: 403 });
  return session;
}

// src/components/auth/RoleGate.tsx
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export type Role = "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export default async function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;

  if (!session) redirect("/login");
  if (!role) redirect("/login");

  if (!allow.includes(role)) {
    const map: Record<Role, string> = {
      SUPERADMIN: "/admin/superadmin",
      ADMIN: "/admin",
      CT: "/ct",
      MEDICO: "/medico",
      JUGADOR: "/jugador",
      DIRECTIVO: "/directivo",
    };
    redirect(map[role]);
  }

  return <>{children}</>;
}

// src/components/auth/RoleGate.tsx
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

type Role = "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export default async function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as Role | undefined;

  if (!session) redirect("/login");
  if (!role || !allow.includes(role)) {
    // Redirigir a su home por rol
    const map: Record<Role, string> = {
      ADMIN: "/admin",
      CT: "/ct",
      MEDICO: "/medico",
      JUGADOR: "/jugador",
      DIRECTIVO: "/directivo",
    };
    redirect(role ? map[role] : "/login");
  }

  return <>{children}</>;
}

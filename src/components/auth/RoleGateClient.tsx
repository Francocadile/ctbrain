"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type Role = "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export default function RoleGateClient({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const role = session.user?.role as Role | undefined;
    if (!role || !allow.includes(role)) {
      const map: Record<Role, string> = {
        SUPERADMIN: "/superadmin",
        ADMIN: "/admin",
        CT: "/ct",
        MEDICO: "/medico",
        JUGADOR: "/jugador",
        DIRECTIVO: "/directivo",
      };
      router.replace(role ? map[role] : "/login");
    }
  }, [session, status, allow, router]);

  if (status === "loading") {
    return <div className="text-center py-10 text-gray-400">Verificando sesión...</div>;
  }
  if (!session || !allow.includes(session.user?.role as Role)) {
    return null;
  }
  return <>{children}</>;
}

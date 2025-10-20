"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RoleGate({
  allow,
  children,
}: {
  allow: string[] | string;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = Array.isArray(allow) ? allow : [allow];

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as any)?.role;

    if (!role) {
      router.push("/login");
      return;
    }
    // SUPERADMIN siempre pasa
    if (role === "SUPERADMIN") return;

    if (!allowed.includes(role)) {
      router.push("/");
    }
  }, [status, session, router]);

  return <>{children}</>;
}
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
    const map: Record<Role, string> = {
      ADMIN: "/admin",
      CT: "/ct",
      MEDICO: "/medico",   // ← back al mapping original
      JUGADOR: "/jugador",
      DIRECTIVO: "/directivo",
    };
    redirect(role ? map[role] : "/login");
  }

  return <>{children}</>;
}

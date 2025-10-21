"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Role = "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export default function RoleGate({
  allow,
  children,
}: {
  allow: Role[] | Role;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = Array.isArray(allow) ? allow : [allow];

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user as any)?.role as Role | undefined;

    if (!role) {
      router.replace("/login");
      return;
    }

    // SUPERADMIN siempre pasa
    if (role === "SUPERADMIN") return;

    if (!allowed.includes(role)) {
      router.replace("/");
    }
  }, [status, session, router, allowed]);

  // evita parpadeo mientras se resuelve la sesión
  if (status !== "authenticated") return null;

  return <>{children}</>;
}
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Role = "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

export default function RoleGate({
  allow,
  children,
}: {
  allow: Role[] | Role;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = Array.isArray(allow) ? allow : [allow];

  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user as any)?.role as Role | undefined;

    if (!role) {
      router.replace("/login");
      return;
    }

    // SUPERADMIN siempre pasa
    if (role === "SUPERADMIN") return;

    if (!allowed.includes(role)) {
      router.replace("/");
    }
  }, [status, session, router, allowed]);

  // Evita parpadeo mientras se resuelve la sesión
  if (status !== "authenticated") return null;

  return <>{children}</>;
}

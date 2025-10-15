"use client";

import React from "react";
import { hasAnyRoleStrings } from "@/lib/role-utils";

/**
 * RoleGate: Renderiza children solo si el usuario tiene el rol requerido.
 * Si es SUPERADMIN, renderiza siempre.
 * roles: acepta string[] (ej: "CT", "COACH", "ADMIN", "SUPERADMIN", etc.)
 */
export default function RoleGate({
  session,
  roles,
  children,
}: {
  session: any;
  roles: string[];
  children: React.ReactNode;
}) {
  if (session?.user?.role === "SUPERADMIN") return <>{children}</>;
  if (hasAnyRoleStrings(session, roles)) return <>{children}</>;
  return null;
}

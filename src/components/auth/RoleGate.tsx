// src/components/auth/RoleGate.tsx
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

type Role = "SUPERADMIN" | "ADMIN" | "CT" | "MEDICO" | "JUGADOR" | "DIRECTIVO";

function roleHome(role?: Role) {
  switch (role) {
    case "SUPERADMIN":
      return "/superadmin";
    case "ADMIN":
      return "/admin";
    case "CT":
      return "/ct";
    case "MEDICO":
      return "/medico";
    case "JUGADOR":
      return "/jugador";
    case "DIRECTIVO":
      return "/directivo";
    default:
      return "/login";
  }
}

export default async function RoleGate({
  allow,
  requireTeam = false,
  children,
}: {
  allow: Role[];
  requireTeam?: boolean;
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.info("[RoleGate] deny", {
      reason: "no-session",
      allow,
      requireTeam,
    });
    redirect("/login");
  }

  const role = session.user.role as Role | undefined;
  if (!role || !allow.includes(role)) {
    console.info("[RoleGate] deny", {
      reason: "role-mismatch",
      allow,
      requireTeam,
      role,
      userId: session.user.id,
    });
    redirect(roleHome(role));
  }

  if (requireTeam) {
    const currentTeamId =
      typeof (session.user as any).currentTeamId === "string"
        ? ((session.user as any).currentTeamId as string)
        : null;

    if (!currentTeamId) {
      console.info("[RoleGate] deny", {
        reason: "missing-team",
        allow,
        role,
        requireTeam,
        userId: session.user.id,
      });

      return (
        <main className="min-h-[60vh] bg-gray-50 px-6 py-10">
          <div className="mx-auto max-w-lg rounded-2xl border bg-white p-6 text-center shadow-sm space-y-4">
            <h1 className="text-xl font-semibold">Seleccioná un equipo</h1>
            <p className="text-sm text-gray-600">
              Elegí un equipo activo desde el selector del dashboard.
            </p>
            <a
              href="/ct"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Ir al dashboard
            </a>
          </div>
        </main>
      );
    }
  }

  return <>{children}</>;
}

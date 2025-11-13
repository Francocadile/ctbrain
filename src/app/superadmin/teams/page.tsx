// src/app/superadmin/teams/page.tsx

import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });

  let teams: any[] = [];
  let error: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("UNAUTHENTICATED");
    }
    if (session.user.role !== "SUPERADMIN") {
      throw new Error("FORBIDDEN");
    }
    teams = await prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
  } catch (e: any) {
    error = e instanceof Error ? e.message : "Error al cargar equipos";
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Equipos · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Gestiona todos los equipos de la plataforma.</p>
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        <section className="mt-8">
          <table className="min-w-full border rounded-xl bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">ID</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-4 text-gray-400">No hay equipos registrados.</td></tr>
              ) : (
                teams.map((team) => (
                  <TeamRow key={team.id} team={team} />
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </RoleGate>
  );
}

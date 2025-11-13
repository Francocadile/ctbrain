// src/app/superadmin/teams/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";
import TeamRow from "./TeamRow";
import { headers } from "next/headers";
import Modal from "@/components/ui/Modal";
import { useState } from "react";
const CreateTeamForm = dynamic(() => import("./CreateTeamForm"), { ssr: false });
export default async function SuperAdminTeamsPage() {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const heads = headers();
  const host = heads.get("host");
  const protocol = heads.get("x-forwarded-proto") ?? "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;

  let teams: any[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/superadmin/teams`, {
      cache: "no-store",
      credentials: "include",
      headers: {
        cookie: heads.get("cookie") ?? ""
      },
    });

    if (!res.ok) {
      let detail = "";
      try {
        const json = await res.json();
        if (json?.error) detail = ` (${json.error})`;
      } catch {}
      throw new Error(`Status ${res.status}${detail}`);
    }

    teams = await res.json();
  } catch (e: any) {
    error = e.message;
  }

  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[70vh] px-6 py-10 space-y-10">
        {/* Título y botón crear */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Equipos · SUPERADMIN</h1>
            <p className="text-gray-600 mt-1">
              Gestiona equipos, administradores y estructura global.
            </p>
          </div>
          <button
            className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold shadow hover:bg-blue-700 transition"
            onClick={() => setModalOpen(true)}
          >
            + Crear nuevo equipo
          </button>
        </header>

        {/* Modal para crear equipo */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <h2 className="text-xl font-semibold mb-4">Crear nuevo equipo</h2>
          <CreateTeamForm onSuccess={() => { setModalOpen(false); window.location.reload(); }} />
        </Modal>

        {/* Tabla de equipos */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Equipos existentes</h2>

          {error && (
            <div className="mb-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-4 py-2 text-left font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No hay equipos registrados.
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <TeamRow key={team.id} team={team} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </RoleGate>
  );
}

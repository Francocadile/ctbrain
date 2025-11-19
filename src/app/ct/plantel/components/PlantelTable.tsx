"use client";

import CreatePlayerForm from "@/app/ct/plantel/components/CreatePlayerForm";
import PlantelRow from "@/app/ct/plantel/components/PlantelRow";

// Mientras el client de Prisma no exponga el tipo Player, usamos una forma mínima tipada.
export type PlayerWithUser = {
  id: string;
  teamId: string;
  userId: string | null;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  photoUrl: string | null;
  birthDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
};

export default function PlantelTable({ players }: { players: PlayerWithUser[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Plantel</h2>
          <p className="text-xs text-gray-500">Gestiona jugadores, dorsales y acceso a la app.</p>
        </div>
        <CreatePlayerForm />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Foto</th>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Posición</th>
              <th className="px-3 py-2 text-left">Dorsal</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Acceso</th>
              <th className="px-3 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-center text-gray-400" colSpan={7}>
                  Aún no hay jugadores cargados.
                </td>
              </tr>
            ) : (
              players.map((p) => <PlantelRow key={p.id} player={p} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

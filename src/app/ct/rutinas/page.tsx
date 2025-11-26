import { dbScope } from "@/lib/dbScope";
import { NewRoutineButton } from "./NewRoutineButton";
import { RoutineActions } from "./RoutineActions";

export const dynamic = "force-dynamic";

type RoutineListItem = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  visibility: string | null;
  notesForAthlete: string | null;
  blocksCount: number;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
};

export default async function CTRoutinesPage() {
  const { prisma, team } = await dbScope();

  const routines = await prisma.routine.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          blocks: true,
          items: true,
        },
      },
    },
  });

  const rows: RoutineListItem[] = routines.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    goal: r.goal ?? null,
    visibility: r.visibility ?? null,
    notesForAthlete: r.notesForAthlete ?? null,
    blocksCount: r._count?.blocks ?? 0,
    itemsCount: r._count?.items ?? 0,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rutinas</h1>
          <p className="text-sm text-gray-500">Listado de rutinas creadas para este equipo.</p>
        </div>
        <NewRoutineButton />
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600 bg-white">
          No hay rutinas cargadas todavía.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((routine) => (
            <li key={routine.id}>
              <article className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-emerald-400 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {routine.title || "Nueva rutina"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {routine.goal || routine.description || "Sin objetivo definido"}
                    </p>
                    {routine.notesForAthlete && (
                      <p className="text-[11px] text-blue-600 mt-0.5 truncate">
                        Nota para jugador: {routine.notesForAthlete}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400">
                      {routine.blocksCount} bloque
                      {routine.blocksCount === 1 ? "" : "s"} · {routine.itemsCount} ejercicio
                      {routine.itemsCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-gray-400">
                      Actualizado: {new Date(routine.updatedAt).toLocaleDateString()}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-gray-600 ${
                        routine.visibility === "PLAYER_VISIBLE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {routine.visibility === "PLAYER_VISIBLE" ? "Visible para jugadores" : "Solo staff"}
                    </span>
                  </div>
                </div>

                <RoutineActions routineId={routine.id} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

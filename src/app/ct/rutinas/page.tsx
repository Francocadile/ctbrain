import { dbScope } from "@/lib/dbScope";
import Link from "next/link";
import { NewRoutineButton } from "./NewRoutineButton";

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
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border bg-white p-4 shadow-sm flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <h2 className="font-semibold text-sm">
                  <Link href={`/ct/rutinas/${r.id}`} className="hover:underline">
                    {r.title || "(Sin título)"}
                  </Link>
                </h2>
                <div className="text-xs text-gray-500 line-clamp-2">
                  {r.goal || r.description || "Sin objetivo definido"}
                </div>
                {r.notesForAthlete && (
                  <div className="text-[11px] text-blue-600 line-clamp-1">
                    Nota para jugador: {r.notesForAthlete}
                  </div>
                )}
                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                  <span>
                    {r.blocksCount} bloque{r.blocksCount === 1 ? "" : "s"} · {r.itemsCount} ejercicio
                    {r.itemsCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-gray-400 whitespace-nowrap">
                <div>
                  Actualizado: {new Date(r.updatedAt).toLocaleDateString()}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                    r.visibility === "PLAYER_VISIBLE"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {r.visibility === "PLAYER_VISIBLE" ? "Visible para jugadores" : "Solo staff"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

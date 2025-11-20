import { dbScope } from "@/lib/dbScope";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CTRoutinesPage() {
  const { prisma, team } = await dbScope();

  const routines = await prisma.routine.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rutinas</h1>
          <p className="text-sm text-gray-500">Listado de rutinas creadas para este equipo.</p>
        </div>
        {/* Placeholder: el modal de "Nueva rutina" se implementará con un client component */}
        <div>
          {/* Client component a implementar: <NewRoutineButton /> */}
          <span className="inline-flex items-center rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-500">
            Nueva rutina (pendiente de UI)
          </span>
        </div>
      </header>

      {routines.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600 bg-white">
          No hay rutinas cargadas todavía.
        </div>
      ) : (
        <ul className="space-y-3">
          {routines.map((r: any) => (
            <li key={r.id} className="rounded-xl border bg-white p-4 shadow-sm flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-sm">
                  <Link href={`/ct/rutinas/${r.id}`} className="hover:underline">
                    {r.title}
                  </Link>
                </h2>
                {r.description && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{r.description}</p>
                )}
              </div>
              <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                <div>Creada: {r.createdAt.toLocaleDateString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

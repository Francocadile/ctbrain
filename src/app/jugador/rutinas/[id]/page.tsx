import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function JugadorRutinaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "JUGADOR") {
    return redirect("/login");
  }

  const userId = session.user.id as string;

  const routine = (await prisma.routine.findFirst({
    where: {
      id: params.id,
      OR: [
        { shareMode: "ALL_PLAYERS" },
        {
          shareMode: "SELECTED_PLAYERS",
          sharedWithPlayers: {
            some: { playerId: userId },
          },
        },
      ],
    },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  } as any)) as any;

  if (!routine) {
    return notFound();
  }

  const blocks = (routine.blocks || []) as any[];
  const items = (routine.items || []) as any[];

  const itemsByBlock: Record<string, any[]> = {};
  const unassigned: any[] = [];
  for (const it of items) {
    if (it.blockId) {
      if (!itemsByBlock[it.blockId]) itemsByBlock[it.blockId] = [];
      itemsByBlock[it.blockId].push(it);
    } else {
      unassigned.push(it);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
        <h1 className="text-lg font-semibold">{routine.title}</h1>
        {routine.goal && (
          <p className="text-sm text-gray-700">Objetivo: {routine.goal}</p>
        )}
        {routine.notesForAthlete && (
          <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
            {routine.notesForAthlete}
          </p>
        )}
      </section>

      {blocks.map((b) => (
        <section
          key={b.id}
          className="rounded-xl border bg-gray-50 p-4 shadow-sm space-y-2"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-900">{b.name}</h2>
            {b.description && (
              <p className="text-xs text-gray-600 whitespace-pre-line">{b.description}</p>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {(itemsByBlock[b.id] || []).map((it) => (
              <div
                key={it.id}
                className="rounded-lg border bg-white px-3 py-2 text-xs space-y-1"
              >
                <div className="font-medium text-gray-900">
                  {it.exerciseName || it.title}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {it.sets != null && (
                    <div>
                      <p className="text-[10px] text-gray-500">Series</p>
                      <p className="text-[11px] text-gray-900">{it.sets}</p>
                    </div>
                  )}
                  {it.reps != null && (
                    <div>
                      <p className="text-[10px] text-gray-500">Reps</p>
                      <p className="text-[11px] text-gray-900">{it.reps}</p>
                    </div>
                  )}
                  {it.load && (
                    <div>
                      <p className="text-[10px] text-gray-500">Carga</p>
                      <p className="text-[11px] text-gray-900">{it.load}</p>
                    </div>
                  )}
                  {it.tempo && (
                    <div>
                      <p className="text-[10px] text-gray-500">Tempo</p>
                      <p className="text-[11px] text-gray-900">{it.tempo}</p>
                    </div>
                  )}
                  {it.rest && (
                    <div>
                      <p className="text-[10px] text-gray-500">Descanso</p>
                      <p className="text-[11px] text-gray-900">{it.rest}</p>
                    </div>
                  )}
                </div>

                {it.videoUrl && (
                  <div className="mt-1">
                    <a
                      href={it.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Ver video
                    </a>
                  </div>
                )}
              </div>
            ))}

            {(itemsByBlock[b.id] || []).length === 0 && (
              <p className="text-[11px] text-gray-400">No hay ejercicios en este bloque.</p>
            )}
          </div>
        </section>
      ))}

      {unassigned.length > 0 && (
        <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Otros ejercicios</h2>
          <div className="space-y-2">
            {unassigned.map((it) => (
              <div
                key={it.id}
                className="rounded-lg border bg-white px-3 py-2 text-xs space-y-1"
              >
                <div className="font-medium text-gray-900">
                  {it.exerciseName || it.title}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {it.sets != null && (
                    <div>
                      <p className="text-[10px] text-gray-500">Series</p>
                      <p className="text-[11px] text-gray-900">{it.sets}</p>
                    </div>
                  )}
                  {it.reps != null && (
                    <div>
                      <p className="text-[10px] text-gray-500">Reps</p>
                      <p className="text-[11px] text-gray-900">{it.reps}</p>
                    </div>
                  )}
                  {it.load && (
                    <div>
                      <p className="text-[10px] text-gray-500">Carga</p>
                      <p className="text-[11px] text-gray-900">{it.load}</p>
                    </div>
                  )}
                  {it.tempo && (
                    <div>
                      <p className="text-[10px] text-gray-500">Tempo</p>
                      <p className="text-[11px] text-gray-900">{it.tempo}</p>
                    </div>
                  )}
                  {it.rest && (
                    <div>
                      <p className="text-[10px] text-gray-500">Descanso</p>
                      <p className="text-[11px] text-gray-900">{it.rest}</p>
                    </div>
                  )}
                </div>

                {it.videoUrl && (
                  <div className="mt-1">
                    <a
                      href={it.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Ver video
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

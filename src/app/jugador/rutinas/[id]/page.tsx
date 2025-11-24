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
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <PlayerRoutineHeader routine={routine} />

      <div className="space-y-4">
        {blocks.map((b) => (
          <PlayerRoutineBlock
            key={b.id}
            block={b}
            items={itemsByBlock[b.id] || []}
          />
        ))}

        {unassigned.length > 0 && (
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Otros ejercicios</h2>
            <p className="text-[11px] text-gray-500">
              Ejercicios que no están dentro de un bloque específico.
            </p>
            <div className="space-y-2">
              {unassigned.map((it) => (
                <PlayerRoutineItemCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PlayerRoutineHeader({ routine }: { routine: any }) {
  const isToday = false; // TODO: detectar si esta rutina corresponde a "hoy"

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-gray-900">{routine.title}</h1>
          {routine.goal && (
            <p className="text-sm text-gray-700">Objetivo: {routine.goal}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-50">
            {/* TODO: reemplazar por lógica real cuando haya info de calendario */}
            {isToday ? "Rutina de hoy" : "Rutina guardada"}
          </span>
        </div>
      </div>

      {routine.notesForAthlete && (
        <div className="border-t pt-2 mt-2">
          <p className="text-[11px] font-semibold text-gray-600 mb-1">
            Notas del CT
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {routine.notesForAthlete}
          </p>
        </div>
      )}
    </section>
  );
}

function PlayerRoutineBlock({
  block,
  items,
}: {
  block: any;
  items: any[];
}) {
  const hasItems = items.length > 0;

  return (
    <section className="rounded-xl border bg-gray-50 p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-900">{block.name}</h2>
          {block.description && (
            <p className="text-xs text-gray-600 whitespace-pre-line">
              {block.description}
            </p>
          )}
        </div>
        {hasItems && (
          <span className="mt-0.5 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200">
            {items.length} ejercicio{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {hasItems ? (
        <div className="mt-1 space-y-2">
          {items.map((it) => (
            <PlayerRoutineItemCard key={it.id} item={it} />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 mt-1">
          No hay ejercicios en este bloque.
        </p>
      )}
    </section>
  );
}

function PlayerRoutineItemCard({ item }: { item: any }) {
  const name = item.exerciseName || item.title;

  return (
    <article className="rounded-lg border bg-white px-3 py-2 text-xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{name}</p>
        </div>
        {item.videoUrl && (
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[11px] text-blue-600 hover:underline"
          >
            Ver video
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
        {item.sets != null && (
          <PlayerRoutineParam label="Series" value={item.sets} />
        )}
        {item.reps != null && (
          <PlayerRoutineParam label="Reps" value={item.reps} />
        )}
        {item.load && <PlayerRoutineParam label="Carga" value={item.load} />}
        {item.tempo && <PlayerRoutineParam label="Tempo" value={item.tempo} />}
        {item.rest && <PlayerRoutineParam label="Descanso" value={item.rest} />}
      </div>

      {(item.athleteNotes || item.notes) && (
        <div className="pt-1 border-t mt-2">
          <p className="text-[10px] font-medium text-gray-500 mb-0.5">
            Indicaciones
          </p>
          <p className="text-[11px] text-gray-700 whitespace-pre-line">
            {item.athleteNotes || item.notes}
          </p>
        </div>
      )}
    </article>
  );
}

function PlayerRoutineParam({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-[11px] text-gray-900">{value}</p>
    </div>
  );
}

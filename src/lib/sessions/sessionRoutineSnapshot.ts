import prisma from "@/lib/prisma";

export type SessionRoutineSnapshotItem = {
  id: string;
  blockName: string | null;
  blockType: string | null;
  title: string;
  sets: number | null;
  reps: number | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
  athleteNotes: string | null;
  order: number;
};

export type SessionRoutineSnapshot = {
  routineId: string | null;
  itemsByRoutine: Record<
    string,
    {
      routineId: string | null;
      items: SessionRoutineSnapshotItem[];
    }
  >;
};

export async function getSessionRoutineSnapshot(
  sessionId: string
): Promise<SessionRoutineSnapshot | null> {
  if (!sessionId) return null;

  const items = await prisma.sessionRoutineItem.findMany({
    where: { sessionId },
    orderBy: { order: "asc" },
  });

  if (!items.length) {
    return { routineId: null, itemsByRoutine: {} };
  }

  const itemsByRoutine: SessionRoutineSnapshot["itemsByRoutine"] = {};

  for (const it of items) {
    const key = it.routineId ?? "__no_routine__";
    if (!itemsByRoutine[key]) {
      itemsByRoutine[key] = {
        routineId: it.routineId ?? null,
        items: [],
      };
    }

    itemsByRoutine[key].items.push({
      id: it.id,
      blockName: it.blockName ?? null,
      blockType: it.blockType ?? null,
      title: it.title,
      sets: it.sets ?? null,
      reps: it.reps ?? null,
      load: it.load ?? null,
      tempo: it.tempo ?? null,
      rest: it.rest ?? null,
      notes: it.notes ?? null,
      athleteNotes: it.athleteNotes ?? null,
      order: it.order,
    });
  }

  // rutina "principal" por defecto: la primera con routineId no nulo
  const firstKey = Object.keys(itemsByRoutine).find((k) => k !== "__no_routine__") ?? null;

  return {
    routineId: firstKey,
    itemsByRoutine,
  };
}

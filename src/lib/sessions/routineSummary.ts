import prisma from "@/lib/prisma";

export type RoutineItemSummary = {
  id: string;
  title: string;
  sets: number | null;
  reps: number | null;
  load: string | null;
  tempo: string | null;
  rest: string | null;
  notes: string | null;
  athleteNotes: string | null;
};

export type RoutineBlockSummary = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  items: RoutineItemSummary[];
};

export type RoutineSummary = {
  id: string;
  title: string;
  goal: string | null;
  notesForAthlete: string | null;
  blocks: RoutineBlockSummary[];
};

export async function getRoutineSummaryForTeam(
  routineId: string,
  teamId: string
): Promise<RoutineSummary | null> {
  if (!routineId || !teamId) return null;

  const routine = await prisma.routine.findFirst({
    where: { id: routineId, teamId },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: {
          items: {
            orderBy: { order: "asc" },
          },
        },
      },
      items: {
        where: { blockId: null },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!routine) return null;

  const blocks: RoutineBlockSummary[] = [];

  for (const b of routine.blocks) {
    blocks.push({
      id: b.id,
      name: b.name || "Bloque",
      type: (b as any).type ?? null,
      description: b.description ?? null,
      items: b.items.map((it) => ({
        id: it.id,
        title: it.exerciseName || it.title || "Ejercicio",
        sets: it.sets,
        reps: it.reps,
        load: it.load,
        tempo: it.tempo,
        rest: it.rest,
        notes: it.notes,
        athleteNotes: it.athleteNotes,
      })),
    });
  }

  if (routine.items && routine.items.length > 0) {
    blocks.push({
      id: "__unassigned__",
      name: "Sin bloque",
      type: null,
      description: null,
      items: routine.items.map((it) => ({
        id: it.id,
        title: it.exerciseName || it.title || "Ejercicio",
        sets: it.sets,
        reps: it.reps,
        load: it.load,
        tempo: it.tempo,
        rest: it.rest,
        notes: it.notes,
        athleteNotes: it.athleteNotes,
      })),
    });
  }

  return {
    id: routine.id,
    title: routine.title || "Rutina",
    goal: routine.goal ?? null,
    notesForAthlete: routine.notesForAthlete ?? null,
    blocks,
  };
}

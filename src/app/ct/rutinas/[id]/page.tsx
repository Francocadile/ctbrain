import { notFound } from "next/navigation";
import { dbScope } from "@/lib/dbScope";
import { RoutineDetailClient } from "./RoutineDetailClient";

export const dynamic = "force-dynamic";

export default async function CTRoutineDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { prisma, team } = await dbScope();

  const routine = (await prisma.routine.findFirst({
    where: { id: params.id, teamId: team.id },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
      sharedWithPlayers: {
        select: { playerId: true },
      },
      sessions: {
        include: {
          session: true,
        },
      },
    },
  } as any)) as any;

  if (!routine) {
    return notFound();
  }

  const sharedPlayerIds = routine.sharedWithPlayers.map((s: any) => s.playerId);

  const dto = {
    routine: {
      id: routine.id,
      title: routine.title,
      description: routine.description ?? null,
      goal: routine.goal ?? null,
      visibility: routine.visibility ?? null,
      notesForAthlete: routine.notesForAthlete ?? null,
      shareMode: routine.shareMode,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
    },
    blocks: routine.blocks.map((b: any) => ({
      id: b.id,
      name: b.name,
      order: b.order,
      description: b.description ?? null,
    })),
    items: routine.items.map((it: any) => ({
      id: it.id,
      routineId: it.routineId,
      blockId: it.blockId ?? null,
      title: it.title,
      description: it.description ?? null,
      order: it.order,
      exerciseName: it.exerciseName ?? null,
      exerciseId: it.exerciseId ?? null,
      sets: it.sets ?? null,
      reps: it.reps ?? null,
      load: it.load ?? null,
      tempo: it.tempo ?? null,
      rest: it.rest ?? null,
      notes: it.notes ?? null,
      athleteNotes: it.athleteNotes ?? null,
      videoUrl: it.videoUrl ?? null,
    })),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <RoutineDetailClient
        routine={dto.routine}
        blocks={dto.blocks}
        items={dto.items}
        sharedPlayerIds={sharedPlayerIds}
      />
    </div>
  );
}

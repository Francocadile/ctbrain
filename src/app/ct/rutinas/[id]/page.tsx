import { notFound } from "next/navigation";
import { dbScope } from "@/lib/dbScope";
import { RoutineDetailClient } from "./RoutineDetailClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAYS: Array<{ key: Weekday; label: string }> = [
  { key: "MON", label: "L" },
  { key: "TUE", label: "M" },
  { key: "WED", label: "X" },
  { key: "THU", label: "J" },
  { key: "FRI", label: "V" },
  { key: "SAT", label: "S" },
  { key: "SUN", label: "D" },
];

function normalizeDay(x: unknown): Weekday {
  return WEEKDAYS.some((d) => d.key === x) ? (x as Weekday) : "MON";
}

export default async function CTRoutineDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { day?: string };
}) {
  const { prisma, team } = await dbScope();

  const selectedDay = normalizeDay(searchParams?.day);

  // Auto-create (idempotent) weekday mapping on first access.
  // If the ensure call fails (e.g. CSRF restrictions), we silently fall back to the base routine.
  let effectiveRoutineId = params.id;
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${origin}/api/ct/routines/${params.id}/program`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weekday: selectedDay }),
    });
    if (res.ok) {
      const json = (await res.json()) as any;
      const match = (json?.days || []).find((d: any) => d?.weekday === selectedDay);
      if (match?.routineId) effectiveRoutineId = match.routineId;
    }
  } catch {
    // noop
  }

  const routine = (await prisma.routine.findFirst({
    where: { id: effectiveRoutineId, teamId: team.id },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
      sharedWithPlayers: {
        select: { playerId: true },
      },
      //  sessions: ... eliminado porque no existe esa relacin en el modelo
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Rutina por día</div>
        <div className="flex gap-2">
          {WEEKDAYS.map((d) => {
            const active = d.key === selectedDay;
            return (
              <Link
                key={d.key}
                href={`/ct/rutinas/${params.id}?day=${d.key}`}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {d.label}
              </Link>
            );
          })}
        </div>
      </div>
      <RoutineDetailClient
        routine={dto.routine}
        blocks={dto.blocks}
        items={dto.items}
        sharedPlayerIds={sharedPlayerIds}
      />
    </div>
  );
}

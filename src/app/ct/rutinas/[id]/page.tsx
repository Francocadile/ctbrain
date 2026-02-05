import { notFound } from "next/navigation";
import { dbScope } from "@/lib/dbScope";
import { RoutineDetailClient } from "./RoutineDetailClient";
import Link from "next/link";
import WeekProgramActivator from "./WeekProgramActivator";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAYS: Array<{
  key: Weekday;
  short: string;
  full: string;
}> = [
  { key: "MON", short: "L", full: "Lunes" },
  { key: "TUE", short: "M", full: "Martes" },
  { key: "WED", short: "X", full: "Miércoles" },
  { key: "THU", short: "J", full: "Jueves" },
  { key: "FRI", short: "V", full: "Viernes" },
  { key: "SAT", short: "S", full: "Sábado" },
  { key: "SUN", short: "D", full: "Domingo" },
];

function normalizeDay(x: unknown): Weekday {
  return WEEKDAYS.some((d) => d.key === x) ? (x as Weekday) : "MON";
}

export default async function CTRoutineDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { day?: string; week?: string };
}) {
  const { prisma, team } = await dbScope();

  const selectedDay = normalizeDay(searchParams?.day);
  const selectedWeek = Math.min(4, Math.max(1, Number(searchParams?.week ?? 1) || 1));

  // Read mapping (no mutation). If it doesn't exist, we fallback to base routine and show a CTA to activate.
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let program: { programId: string | null; weeks: Array<{ id: string; weekNumber: number; label: string | null; days: Array<{ weekday: Weekday; routineId: string }> }> } = {
    programId: null,
    weeks: [],
  };
  try {
    const res = await fetch(`${origin}/api/ct/routines/${params.id}/program`, {
      method: "GET",
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as any;
      program = {
        programId: json?.programId ?? null,
        weeks: Array.isArray(json?.weeks) ? json.weeks : [],
      };
    }
  } catch {
    // noop
  }

  const selectedWeekObj = (program.weeks || []).find((w) => Number(w.weekNumber) === selectedWeek) ?? null;

  const mappingByDay = new Map<Weekday, string>();
  for (const d of selectedWeekObj?.days || []) {
    if (d?.weekday && d?.routineId) mappingByDay.set(d.weekday, d.routineId);
  }

  const effectiveRoutineId = mappingByDay.get(selectedDay) ?? params.id;

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

  const baseRoutine = await prisma.routine.findFirst({
    where: { id: params.id, teamId: team.id },
    select: { id: true, title: true },
  });

  // Titles for the 7 routines of the selected week (in weekday-template mode, this doesn't change across weeks)
  const routineIdsForWeek = WEEKDAYS.map((d) => mappingByDay.get(d.key)).filter(Boolean) as string[];
  const routinesForWeek =
    routineIdsForWeek.length > 0
      ? await prisma.routine.findMany({
          where: { teamId: team.id, id: { in: routineIdsForWeek } },
          select: { id: true, title: true },
        })
      : [];

  const titleByRoutineId = new Map<string, string>();
  for (const r of routinesForWeek) titleByRoutineId.set(r.id, r.title);

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

  const selectedDayLabel = WEEKDAYS.find((d) => d.key === selectedDay)?.full ?? "";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Semana {selectedWeek}</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Plan semanal</h1>
          <div className="text-sm text-muted-foreground">
            {baseRoutine ? <>Rutina base: <span className="font-medium text-foreground">{baseRoutine.title}</span></> : null}
          </div>
        </div>

        {/* Week selector */}
        <div className="flex items-center gap-2">
          <Link
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm ${selectedWeek === 1 ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}
            aria-label="Semana anterior"
            href={`/ct/rutinas/${params.id}?week=${Math.max(1, selectedWeek - 1)}&day=${selectedDay}`}
          >
            ◀
          </Link>
          <div className="rounded-md border bg-background px-3 py-2 text-sm font-medium">Semana {selectedWeek}</div>
          <Link
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm ${selectedWeek === 4 ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}
            aria-label="Semana siguiente"
            href={`/ct/rutinas/${params.id}?week=${Math.min(4, selectedWeek + 1)}&day=${selectedDay}`}
          >
            ▶
          </Link>
        </div>
      </div>

      {/* CTA when program is not yet activated */}
  {!program.programId ? <WeekProgramActivator baseRoutineId={params.id} /> : null}

      {/* Weekly grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Semana {selectedWeek} · {selectedDayLabel}</div>
          <div className="text-xs text-muted-foreground">Elegí un día para editar</div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <div className="grid min-w-[840px] grid-cols-7 gap-3 md:min-w-0">
            {WEEKDAYS.map((d) => {
              const isActive = d.key === selectedDay;
              const rid = mappingByDay.get(d.key) ?? null;
              const dayTitle = rid ? titleByRoutineId.get(rid) ?? "Rutina asignada" : "Sin rutina";

              return (
                <Link
                  key={d.key}
                  href={`/ct/rutinas/${params.id}?week=${selectedWeek}&day=${d.key}`}
                  className={`block rounded-xl border p-3 transition ${
                    isActive
                      ? "border-foreground/40 bg-muted shadow-sm"
                      : "bg-background hover:bg-muted"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{d.short}</div>
                      <div className="text-sm font-semibold">{d.full}</div>
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-foreground px-2 py-1 text-[11px] font-medium text-background">
                        Editando
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-sm">
                    <div className={`line-clamp-2 ${rid ? "text-foreground" : "text-muted-foreground"}`}>
                      {dayTitle}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-3">
        <div className="rounded-lg border bg-background p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Editando</div>
          <div className="text-lg font-semibold">{selectedDayLabel}</div>
          <div className="text-sm text-muted-foreground">
            Los cambios se guardan en la rutina correspondiente al día seleccionado.
          </div>
        </div>

        <RoutineDetailClient
          routine={dto.routine}
          blocks={dto.blocks}
          items={dto.items}
          sharedPlayerIds={sharedPlayerIds}
        />
      </div>
    </div>
  );
}

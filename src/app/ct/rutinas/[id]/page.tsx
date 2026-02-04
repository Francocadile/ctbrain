import { notFound } from "next/navigation";
import { dbScope } from "@/lib/dbScope";
import { RoutineDetailClient } from "./RoutineDetailClient";
import Link from "next/link";

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr] md:gap-6">
        {/* Mobile day nav (horizontal) */}
        <div className="md:hidden">
          <h1 className="text-2xl font-semibold tracking-tight">
            {WEEKDAYS.find((d) => d.key === selectedDay)?.full}
          </h1>
          <div className="mt-3 -mx-4 overflow-x-auto px-4">
            <div className="inline-flex min-w-max gap-1 rounded-lg bg-muted p-1">
              {WEEKDAYS.map((d) => {
                const active = d.key === selectedDay;
                return (
                  <Link
                    key={d.key}
                    href={`/ct/rutinas/${params.id}?day=${d.key}`}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-background text-xs">
                      {d.short}
                    </span>
                    <span className="whitespace-nowrap">{d.full}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop sidebar day nav (vertical) */}
        <aside className="hidden md:block">
          <div className="sticky top-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Días</div>
            <nav className="rounded-lg border bg-background p-1">
              <ul className="space-y-1">
                {WEEKDAYS.map((d) => {
                  const active = d.key === selectedDay;
                  return (
                    <li key={d.key}>
                      <Link
                        href={`/ct/rutinas/${params.id}?day=${d.key}`}
                        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-muted text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-xs ${
                            active ? "border-foreground/20" : "border-muted-foreground/20"
                          }`}
                        >
                          {d.short}
                        </span>
                        <span>{d.full}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Editor column */}
        <section className="space-y-3">
          <div className="hidden md:block">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Semana 1</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {WEEKDAYS.find((d) => d.key === selectedDay)?.full}
            </h1>
          </div>
          <RoutineDetailClient
            routine={dto.routine}
            blocks={dto.blocks}
            items={dto.items}
            sharedPlayerIds={sharedPlayerIds}
          />
        </section>
      </div>
    </div>
  );
}

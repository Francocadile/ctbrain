import { notFound } from "next/navigation";
import Link from "next/link";
import { dbScope } from "@/lib/dbScope";
import { RoutineDetailClient } from "@/app/ct/rutinas/[id]/RoutineDetailClient";

export const dynamic = "force-dynamic";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MON: "Lun",
  TUE: "Mar",
  WED: "Mié",
  THU: "Jue",
  FRI: "Vie",
  SAT: "Sáb",
  SUN: "Dom",
};

export default async function CTProgramDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { week?: string; day?: string };
}) {
  const { prisma, team } = await dbScope();

  const program = (await prisma.program.findFirst({
    where: { id: params.id, teamId: team.id },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: { days: { orderBy: { weekday: "asc" } } },
      },
    },
  } as any)) as any;

  if (!program) return notFound();

  const weeks = (program.weeks || []) as any[];
  const activeWeekId = searchParams?.week || weeks[0]?.id || null;
  const activeWeek = weeks.find((w) => w.id === activeWeekId) || weeks[0] || null;

  const days = (activeWeek?.days || []) as any[];
  const activeDayKey =
    (searchParams?.day as Weekday | undefined) || (days[0]?.weekday as Weekday | undefined) || null;
  const activeDay = days.find((d) => d.weekday === activeDayKey) || days[0] || null;

  if (!activeWeek || !activeDay) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{program.title}</h1>
            <div className="text-sm text-gray-600">Sin semanas/días todavía</div>
          </div>
          <Link href="/ct/programas" className="text-sm text-blue-600 hover:underline">
            Volver
          </Link>
        </div>
        <div className="rounded border p-4 text-sm text-gray-600">
          Este programa todavía no tiene semanas o días cargados.
        </div>
      </div>
    );
  }

  const routine = (await prisma.routine.findFirst({
    where: { id: activeDay.routineId, teamId: team.id },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
      sharedWithPlayers: { select: { playerId: true } },
    },
  } as any)) as any;

  if (!routine) return notFound();

  const sharedPlayerIds = (routine.sharedWithPlayers || []).map((s: any) => s.playerId);

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
    blocks: (routine.blocks || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      order: b.order,
      description: b.description ?? null,
      type: b.type ?? null,
    })),
    items: (routine.items || []).map((it: any) => ({
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{program.title}</h1>
          {program.description ? (
            <div className="text-sm text-gray-600">{program.description}</div>
          ) : null}
        </div>
        <Link href="/ct/programas" className="text-sm text-blue-600 hover:underline">
          Volver
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {weeks.map((w) => {
          const isActive = w.id === activeWeek.id;
          return (
            <Link
              key={w.id}
              href={`/ct/programas/${program.id}?week=${encodeURIComponent(w.id)}&day=${encodeURIComponent(
                (activeDay.weekday as Weekday) || "MON",
              )}`}
              className={
                "px-3 py-1 rounded border text-sm " +
                (isActive ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50")
              }
            >
              Semana {w.weekNumber}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(activeWeek.days || []).map((d: any) => {
          const key = d.weekday as Weekday;
          const isActive = key === (activeDay.weekday as Weekday);
          return (
            <Link
              key={d.id}
              href={`/ct/programas/${program.id}?week=${encodeURIComponent(activeWeek.id)}&day=${encodeURIComponent(
                key,
              )}`}
              className={
                "px-3 py-1 rounded border text-sm " +
                (isActive ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50")
              }
              aria-label={`Día ${WEEKDAY_LABEL[key]}`}
            >
              {WEEKDAY_LABEL[key]}
            </Link>
          );
        })}
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

// ApplyProgram is handled by ApplyProgramClient

import Link from "next/link";
import { notFound } from "next/navigation";
import { dbScope } from "@/lib/dbScope";
import RoutinePlaylist from "./RoutinePlaylist";

export const dynamic = "force-dynamic";

export default async function CTProgramPhasePage({ params }: { params: { phaseId: string } }) {
  const { prisma, team } = await dbScope();

  const phase = await prisma.routineProgramPhase.findFirst({
    where: {
      id: params.phaseId,
      program: { teamId: team.id },
    },
    select: {
      id: true,
      title: true,
      program: {
        select: {
          id: true,
          title: true,
        },
      },
      routines: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          routineId: true,
          order: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!phase) return notFound();

  const routineIds = Array.from(
    new Set<string>((phase.routines || []).map((r: { routineId: string }) => r.routineId)),
  );
  const routines = routineIds.length
    ? await prisma.routine.findMany({
        where: { teamId: team.id, id: { in: routineIds } },
        select: { id: true, title: true },
      })
    : [];

  const titleById = new Map<string, string>();
  for (const r of routines) titleById.set(r.id, r.title);

  const items = (phase.routines || []).map((r: { id: string; routineId: string; order: number }) => ({
    id: r.id,
    routineId: r.routineId,
    routineTitle: titleById.get(r.routineId) ?? null,
    order: r.order,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fase</div>
          <h1 className="text-2xl font-semibold tracking-tight">{phase.title}</h1>
          <div className="text-sm text-muted-foreground">
            Programa: <span className="font-medium text-foreground">{phase.program.title}</span>
          </div>
        </div>

        <Link
          href={`/ct/programas/${phase.program.id}`}
          className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          Volver al programa
        </Link>
      </div>

      <RoutinePlaylist phaseId={phase.id} initialItems={items} />
    </div>
  );
}

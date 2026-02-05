import Link from "next/link";
import { notFound } from "next/navigation";
import { dbScope } from "@/lib/dbScope";
import ProgramTitleEditor from "../ProgramTitleEditor";
import PhaseActions from "../PhaseActions";
import CreatePhaseButtonClient from "./CreatePhaseButtonClient";

export const dynamic = "force-dynamic";

function byOrder(a: { order: number; createdAt: Date }, b: { order: number; createdAt: Date }) {
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export default async function CTProgramDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { prisma, team } = await dbScope();

  const program = await prisma.routineProgram.findFirst({
    where: { id: params.id, teamId: team.id },
    select: {
      id: true,
      title: true,
      description: true,
      phases: {
        select: {
          id: true,
          title: true,
          order: true,
          createdAt: true,
          _count: { select: { routines: true } },
        },
      },
    },
  });

  if (!program) return notFound();

  const phases = (program.phases || []).slice().sort(byOrder);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Programa</div>
          <h1 className="text-3xl font-semibold tracking-tight">{program.title}</h1>
          <div className="text-sm text-muted-foreground">Fases + playlist de rutinas.</div>
        </div>

        <Link
          href="/ct/programas"
          className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          Volver
        </Link>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <ProgramTitleEditor
          programId={program.id}
          initialTitle={program.title}
          initialDescription={program.description ?? null}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Fases</div>
            <div className="text-xs text-muted-foreground">Entrá a cada fase para armar la playlist.</div>
          </div>
          <CreatePhaseButtonClient programId={program.id} existingCount={phases.length} />
        </div>

        {phases.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Sin fases todavía. Creá la primera para empezar.
          </div>
        ) : (
          <div className="space-y-2">
            {phases.map((p: { id: string; title: string; order: number; _count: { routines: number } }) => (
              <div key={p.id} className="rounded-xl border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p._count.routines} rutinas</div>
                    <div className="mt-2">
                      <Link
                        href={`/ct/programas/fases/${p.id}`}
                        className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                      >
                        Abrir fase
                      </Link>
                    </div>
                  </div>

                  <PhaseActions phaseId={p.id} initialTitle={p.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

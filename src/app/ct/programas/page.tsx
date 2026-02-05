import Link from "next/link";
import { dbScope } from "@/lib/dbScope";
import CreateProgramButton from "./CreateProgramButton";

export const dynamic = "force-dynamic";

export default async function CTProgramsPage() {
  const { prisma, team } = await dbScope();

  const programs = await prisma.routineProgram.findMany({
    where: { teamId: team.id },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, title: true, description: true, updatedAt: true },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CT</div>
          <h1 className="text-3xl font-semibold tracking-tight">Programas</h1>
          <div className="text-sm text-muted-foreground">
            Organizá rutinas existentes por fases y orden (playlist).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ct/rutinas"
            className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            Ver rutinas
          </Link>
          <CreateProgramButton />
        </div>
      </div>

      {programs.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
          Todavía no hay programas. Creá el primero para empezar a armar fases.
        </div>
      ) : (
        <div className="rounded-xl border bg-background divide-y">
          {programs.map((p: { id: string; title: string; description: string | null; updatedAt: Date }) => (
            <Link key={p.id} href={`/ct/programas/${p.id}`} className="block p-4 hover:bg-muted/40">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.title}</div>
                  {p.description ? (
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</div>
                  ) : (
                    <div className="mt-1 text-sm text-muted-foreground">Sin descripción</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Actualizado {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

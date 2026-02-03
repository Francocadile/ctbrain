import { notFound } from "next/navigation";
import Link from "next/link";
import { dbScope } from "@/lib/dbScope";
import ApplyProgramClient from "./ApplyProgramClient";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function ProgramDetailPage({ params }: PageProps) {
  const programId = params?.id;
  if (!programId) return notFound();

  const { prisma, team } = await dbScope({ roles: ["CT", "ADMIN"] as any });
  const p: any = prisma;

  const program = await p.routineProgram.findFirst({
    where: { id: programId, teamId: team.id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      days: {
        orderBy: { dayIndex: "asc" },
        select: {
          id: true,
          dayIndex: true,
          label: true,
          routineId: true,
          routine: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!program) return notFound();

  const routines = await p.routine.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">
            <Link href="/ct/programas" className="hover:underline">
              Programas
            </Link>
            <span className="mx-2">/</span>
            <span>{program.title}</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold">{program.title}</h1>
          {program.description ? (
            <p className="text-sm text-gray-600">{program.description}</p>
          ) : (
            <p className="text-sm text-gray-400">Sin descripción</p>
          )}
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Días del programa</h2>
        <ProgramDaysEditor program={program as any} routines={routines as any} />
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Aplicar a sesiones</h2>
        <ApplyProgramClient programId={program.id} />
        <p className="text-[11px] text-gray-500">
          Esto reusa el snapshot actual: no pisa sesiones que ya tengan snapshot de la rutina asignada.
        </p>
      </section>
    </div>
  );
}

function ProgramDaysEditor({
  program,
  routines,
}: {
  program: {
    id: string;
    days: Array<{ id: string; dayIndex: number; label: string | null; routineId: string; routine: any }>;
  };
  routines: Array<{ id: string; title: string }>;
}) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";

        const { prisma, team } = await dbScope({ roles: ["CT", "ADMIN"] as any });
        const p: any = prisma;

        // Expect fields like: dayIndex_1, label_1, routineId_1 ... for N rows.
        const rawN = Number(formData.get("rows") ?? 0);
        const n = Number.isFinite(rawN) && rawN > 0 ? rawN : 0;

        const days: Array<{ dayIndex: number; label?: string; routineId: string }> = [];
        for (let i = 1; i <= n; i += 1) {
          const dayIndex = Number(formData.get(`dayIndex_${i}`) ?? i);
          const label = String(formData.get(`label_${i}`) ?? "").trim();
          const routineId = String(formData.get(`routineId_${i}`) ?? "").trim();
          if (!routineId) continue;
          days.push({ dayIndex, ...(label ? { label } : {}), routineId });
        }

        // Validate routines belong to team
        const routineIds = Array.from(new Set(days.map((d) => d.routineId)));
        const ok = await p.routine.findMany({
          where: { id: { in: routineIds }, teamId: team.id },
          select: { id: true },
        });
        const okSet = new Set(ok.map((r: any) => r.id));
        const invalid = routineIds.filter((id) => !okSet.has(id));
        if (invalid.length) return;

        await p.$transaction(
          days.map((d) =>
            p.routineProgramDay.upsert({
              where: { programId_dayIndex: { programId: program.id, dayIndex: d.dayIndex } },
              update: { label: d.label ?? null, routineId: d.routineId },
              create: {
                programId: program.id,
                dayIndex: d.dayIndex,
                label: d.label ?? null,
                routineId: d.routineId,
              },
            }),
          ),
        );

        // Touch program.updatedAt
        await p.routineProgram.update({ where: { id: program.id }, data: { teamId: team.id } });
      }}
      className="space-y-3"
    >
      <input type="hidden" name="rows" value={Math.max(program.days.length, 7)} />

      <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-gray-600">
        <div className="col-span-2">Día</div>
        <div className="col-span-4">Etiqueta</div>
        <div className="col-span-6">Rutina</div>
      </div>

      {Array.from({ length: Math.max(program.days.length, 7) }).map((_, idx) => {
        const dayIndex = idx + 1;
        const existing = program.days.find((d) => d.dayIndex === dayIndex);
        return (
          <div key={dayIndex} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-2">
              <input
                name={`dayIndex_${dayIndex}`}
                defaultValue={String(dayIndex)}
                className="w-full rounded-md border px-2 py-1 text-sm"
                readOnly
              />
            </div>
            <div className="col-span-4">
              <input
                name={`label_${dayIndex}`}
                defaultValue={existing?.label ?? ""}
                placeholder="(opcional)"
                className="w-full rounded-md border px-2 py-1 text-sm"
              />
            </div>
            <div className="col-span-6">
              <select
                name={`routineId_${dayIndex}`}
                defaultValue={existing?.routineId ?? ""}
                className="w-full rounded-md border px-2 py-1 text-sm bg-white"
              >
                <option value="">(sin asignar)</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      <button
        type="submit"
        className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
      >
        Guardar días
      </button>

      <p className="text-[11px] text-gray-500">
        UI mínima (server actions) para no tocar el editor de rutinas. Si querés lo pasamos a UI con fetch + CSRF.
      </p>
    </form>
  );
}

// ApplyProgram is handled by ApplyProgramClient

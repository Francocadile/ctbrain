import Link from "next/link";
import { dbScope } from "@/lib/dbScope";

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  _count?: { days: number };
};

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const { prisma, team } = await dbScope({ roles: ["CT", "ADMIN"] as any });
  const p: any = prisma;

  const programs = await p.routineProgram.findMany({
    where: { teamId: team.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      _count: { select: { days: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Programas</h1>
          <p className="text-sm text-gray-500">
            Un programa asigna una rutina por día (multi-día) sin tocar el editor de rutinas.
          </p>
        </div>

        <NewProgramButton />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {programs.length === 0 ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
            Todavía no creaste ningún programa.
          </div>
        ) : (
          (programs as unknown as ProgramRow[]).map((p) => (
            <Link
              key={p.id}
              href={`/ct/programas/${p.id}`}
              className="rounded-xl border bg-white p-4 shadow-sm hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.title}</div>
                  {p.description ? (
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {p.description}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-gray-400">Sin descripción</div>
                  )}
                </div>
                <div className="shrink-0 rounded-full border px-2 py-1 text-[11px] text-gray-700">
                  {p._count?.days ?? 0} días
                </div>
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                Actualizado: {new Date(p.updatedAt).toLocaleString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function NewProgramButton() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";

        const title = String(formData.get("title") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim() || null;
        if (!title) return;

        const { prisma, team } = await dbScope({ roles: ["CT", "ADMIN"] as any });
  const p: any = prisma;

        const program = await p.routineProgram.create({
          data: { teamId: team.id, title, description },
          select: { id: true },
        });

        // NOTE: mantenemos esto simple; el listado se actualiza y el usuario entra al detalle desde la card.
        // Si querés redirect automático, lo agregamos con next/navigation.redirect().
      }}
      className="flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm md:min-w-[360px]"
    >
      <div className="text-xs font-semibold text-gray-700">Nuevo programa</div>
      <input
        name="title"
        placeholder="Título"
        className="w-full rounded-md border px-3 py-2 text-sm"
        required
      />
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
      >
        Crear
      </button>
      <p className="text-[11px] text-gray-500">
        Nota: esta pantalla es mínima. Si querés, la cambio a modal + redirect limpio.
      </p>
    </form>
  );
}

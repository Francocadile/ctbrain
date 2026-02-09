import Link from "next/link";

export const dynamic = "force-dynamic";

type RoutineProgramListItem = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
};

export default async function CTRoutineTypesPage() {
  const res = await fetch(`/api/ct/routine-programs`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as any;
  const programs = Array.isArray(json?.programs) ? (json.programs as RoutineProgramListItem[]) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Tipos de Rutina</h1>
        <p className="text-sm text-gray-500">Navegación read-only por Programas → Fases → Bloques → Grilla.</p>
      </header>

      {!res.ok ? (
        <div className="rounded-md border p-3 text-sm text-red-700 bg-red-50">Error cargando programas.</div>
      ) : programs.length === 0 ? (
        <div className="rounded-md border p-3 text-sm text-gray-600 bg-white">No hay programas.</div>
      ) : (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/ct/rutinas/tipos/${p.id}`}
                className="block rounded-md border bg-white px-3 py-2 hover:bg-gray-50"
              >
                <div className="font-medium">{p.title}</div>
                {p.description ? <div className="text-sm text-gray-500">{p.description}</div> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

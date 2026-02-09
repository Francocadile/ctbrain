import Link from "next/link";

export const dynamic = "force-dynamic";

type BlockListItem = {
  id: string;
  key: string;
  title: string | null;
  order: number;
  durationWeeks: number;
};

export default async function CTRoutinePhaseBlocksPage({
  params,
}: {
  params: { programId: string; phaseId: string };
}) {
  const res = await fetch(`/api/ct/routine-phases/${params.phaseId}/blocks`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as any;
  const blocks = Array.isArray(json?.data) ? (json.data as BlockListItem[]) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <header className="space-y-2">
        <div className="text-sm flex gap-4">
          <Link href="/ct/rutinas/tipos" className="text-blue-700 hover:underline">
            ← Tipos
          </Link>
          <Link
            href={`/ct/rutinas/tipos/${params.programId}`}
            className="text-blue-700 hover:underline"
          >
            ← Fases
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Bloques</h1>
        <p className="text-sm text-gray-500">Fase: {params.phaseId}</p>
      </header>

      {!res.ok ? (
        <div className="rounded-md border p-3 text-sm text-red-700 bg-red-50">Error cargando bloques.</div>
      ) : blocks.length === 0 ? (
        <div className="rounded-md border p-3 text-sm text-gray-600 bg-white">No hay bloques.</div>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li key={b.id}>
              <Link
                href={`/ct/rutinas/tipos/bloques/${b.id}`}
                className="block rounded-md border bg-white px-3 py-2 hover:bg-gray-50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-medium">
                    {b.key} {b.title ? <span className="text-gray-500">· {b.title}</span> : null}
                  </div>
                  <div className="text-xs text-gray-500">{b.durationWeeks} semanas</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

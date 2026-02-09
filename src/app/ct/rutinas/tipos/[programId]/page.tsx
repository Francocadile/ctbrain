import Link from "next/link";

export const dynamic = "force-dynamic";

type PhaseListItem = {
  id: string;
  title: string;
  order: number;
};

export default async function CTRoutineTypeDetailPage({
  params,
}: {
  params: { programId: string };
}) {
  const res = await fetch(`/api/ct/routine-programs/${params.programId}/phases`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as any;
  const phases = Array.isArray(json?.data) ? (json.data as PhaseListItem[]) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <header className="space-y-2">
        <div className="text-sm">
          <Link href="/ct/rutinas/tipos" className="text-blue-700 hover:underline">
            ← Volver a tipos
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Fases</h1>
        <p className="text-sm text-gray-500">Programa: {params.programId}</p>
      </header>

      {!res.ok ? (
        <div className="rounded-md border p-3 text-sm text-red-700 bg-red-50">Error cargando fases.</div>
      ) : phases.length === 0 ? (
        <div className="rounded-md border p-3 text-sm text-gray-600 bg-white">No hay fases.</div>
      ) : (
        <ul className="space-y-2">
          {phases.map((ph) => (
            <li key={ph.id}>
              <Link
                href={`/ct/rutinas/tipos/${params.programId}/fases/${ph.id}`}
                className="block rounded-md border bg-white px-3 py-2 hover:bg-gray-50"
              >
                <div className="font-medium">{ph.title}</div>
                <div className="text-xs text-gray-500">Orden: {ph.order}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

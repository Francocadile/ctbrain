import Link from "next/link";

export const dynamic = "force-dynamic";

type GridDay = {
  id: string;
  dayIndex: number;
  label: string | null;
  routineId: string;
  routineTitle: string | null;
};

type GridResponse = {
  data?: {
    block?: {
      id: string;
      phaseId: string;
      key: string;
      title: string | null;
      order: number;
      durationWeeks: number;
    };
    days?: GridDay[];
  };
};

const COLS = 7;

export default async function CTRoutineBlockGridPage({
  params,
}: {
  params: { blockId: string };
}) {
  const res = await fetch(`/api/ct/routine-blocks/${params.blockId}/grid`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as GridResponse;
  const block = json?.data?.block;
  const days = Array.isArray(json?.data?.days) ? (json.data!.days as GridDay[]) : [];
  const durationWeeks = Math.max(0, Number(block?.durationWeeks ?? 0) || 0);

  const dayByIndex = new Map<number, GridDay>();
  for (const d of days) dayByIndex.set(d.dayIndex, d);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <header className="space-y-2">
        <div className="text-sm">
          <Link href="/ct/rutinas/tipos" className="text-blue-700 hover:underline">
            ← Volver a tipos
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Grilla del bloque</h1>
        <p className="text-sm text-gray-500">Bloque: {params.blockId}</p>
        {block ? (
          <div className="text-sm text-gray-600">
            {block.key}
            {block.title ? ` · ${block.title}` : ""} · {block.durationWeeks} semanas
          </div>
        ) : null}
      </header>

      {!res.ok ? (
        <div className="rounded-md border p-3 text-sm text-red-700 bg-red-50">Error cargando grilla.</div>
      ) : !block ? (
        <div className="rounded-md border p-3 text-sm text-gray-600 bg-white">Bloque no encontrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse">
            <thead>
              <tr>
                <th className="border bg-gray-50 p-2 text-left text-xs">Semana</th>
                {Array.from({ length: COLS }).map((_, i) => (
                  <th key={i} className="border bg-gray-50 p-2 text-left text-xs">Día {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: durationWeeks }).map((_, w) => (
                <tr key={w}>
                  <td className="border p-2 text-xs text-gray-600 bg-white">{w + 1}</td>
                  {Array.from({ length: COLS }).map((_, c) => {
                    const dayIndex = w * COLS + c;
                    const d = dayByIndex.get(dayIndex) ?? null;
                    const rid = d?.routineId ?? null;
                    const title = d?.routineTitle ?? null;

                    const cell = (
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500">dayIndex {dayIndex}</div>
                        <div className="text-sm font-medium">
                          {title || (rid ? "Rutina" : "—")}
                        </div>
                      </div>
                    );

                    return (
                      <td key={c} className="border p-2 align-top bg-white">
                        {rid ? (
                          <Link href={`/ct/rutinas/${rid}`} className="block hover:underline">
                            {cell}
                          </Link>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// src/app/ct/sessions/[id]/page.tsx
import { getSessionById, type SessionDTO } from "@/lib/api/sessions";

type TurnKey = "morning" | "afternoon";

// Extrae turn/row/ymd del marcador: [GRID:morning:PRE ENTREN0] | 2025-08-25
function parseMarker(description?: string) {
  const turn = (description?.match(/^\[GRID:(morning|afternoon):/i)?.[1] || "") as
    | TurnKey
    | "";
  const row = description?.match(/^\[GRID:(?:morning|afternoon):(.+?)\]/i)?.[1] || "";
  const ymd = description?.split("|")[1]?.trim() || "";
  return { turn, row, ymd };
}

export default async function SesionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Server Component: fetch en el servidor al mismo host
  const s: SessionDTO | null = await (async () => {
    try {
      const res = await getSessionById(id);
      // tu helper devuelve { data } o el objeto directo; soportamos ambos
      // @ts-expect-error – compat doble
      return (res?.data as SessionDTO) ?? (res as unknown as SessionDTO) ?? null;
    } catch {
      return null;
    }
  })();

  if (!s) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sesión no encontrada</h1>
      </div>
    );
  }

  const marker = parseMarker(typeof s.description === "string" ? s.description : "");
  const dateLabel = s.date
    ? new Date(s.date).toLocaleString(undefined, {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "—";

  return (
    <div className="p-6 md:p-8 space-y-4">
      {/* Header + breadcrumbs */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">
            Tarea — {marker.row || "Bloque"} ·{" "}
            {marker.turn === "morning" ? "Mañana" : marker.turn === "afternoon" ? "Tarde" : "—"}
          </h1>
          <p className="text-xs md:text-sm text-gray-500">
            Día: {marker.ymd || "—"} · {dateLabel} · Tipo: {s.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {marker.ymd && marker.turn && (
            <a
              href={`/ct/sessions/by-day/${marker.ymd}/${marker.turn}?focus=${encodeURIComponent(
                marker.row || ""
              )}`}
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
            >
              ← Volver a sesión
            </a>
          )}
          <a
            href="/ct/dashboard"
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            Dashboard
          </a>
          <a
            href="/ct/plan-semanal"
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs"
          >
            ✏️ Editor
          </a>
        </div>
      </header>

      {/* Resumen de la tarea */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-emerald-50 text-emerald-900 font-semibold px-3 py-2 border-b uppercase tracking-wide text-[12px]">
          Resumen de la tarea
        </div>
        <div className="grid md:grid-cols-4 gap-3 p-3 text-sm">
          <div>
            <div className="text-[11px] text-gray-500">Nombre / Título</div>
            <div className="font-medium">
              {s.title || <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Bloque</div>
            <div className="font-medium">{marker.row || <span className="text-gray-400">—</span>}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Turno</div>
            <div className="font-medium">
              {marker.turn === "morning"
                ? "Mañana"
                : marker.turn === "afternoon"
                ? "Tarde"
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Fecha</div>
            <div className="font-medium">{marker.ymd || <span className="text-gray-400">—</span>}</div>
          </div>
        </div>
      </section>

      {/* Descripción: hoy usamos s.title como contenido del bloque */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          Descripción
        </div>
        <div className="p-3 text-[13px] leading-6 whitespace-pre-wrap">
          {s.title?.trim() ? s.title : <span className="text-gray-400 italic">—</span>}
        </div>
      </section>

      {/* Material gráfico: placeholder para la siguiente iteración */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b text-[12px] font-semibold uppercase tracking-wide">
          Material gráfico (próximo paso)
        </div>
        <div className="p-3 text-sm text-gray-500">
          Aquí mostraremos una imagen/plano táctico o un embed de video de la tarea.
        </div>
      </section>
    </div>
  );
}

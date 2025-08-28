import { getSessionById } from "@/lib/api/sessions";

export default async function SesionDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const res = await getSessionById(id); // server action (fetch en el mismo host)
  const s = res?.data;

  if (!s) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sesión no encontrada</h1>
      </div>
    );
  }

  // Si queremos inferir el link de video desde la semana (fila meta: VIDEO) deberíamos tenerlo en otra sesión con marker [GRID:meta:VIDEO].
  // Para simplificar: si el título de esa meta existe, lo mostramos como enlace incrustado si es YouTube.
  const videoUrlGuess =
    typeof s.description === "string" && s.description.includes("[GRID:meta:VIDEO]")
      ? s.title
      : "";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{s.title || "Sesión"}</h1>
        <div className="text-sm text-gray-500">
          {new Date(s.date).toLocaleString(undefined, {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          Tipo: {s.type}
        </div>
      </div>

      {/* Si la sesión que abrimos fuese una celda de bloque, el video vendrá desde la fila META del mismo día.
          En una próxima iteración podemos resolver "join" por día para mostrar LUGAR/HORA/VIDEO reales de ese día. */}

      {videoUrlGuess ? (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Video</div>
          <a href={videoUrlGuess} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
            Abrir video
          </a>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-sm text-gray-600">Descripción</div>
        <div className="whitespace-pre-wrap rounded-xl border bg-white p-4">
          {typeof s.description === "string" ? s.description : ""}
        </div>
      </div>
    </div>
  );
}

// src/app/ct/rivales/[id]/plantel/page.tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function PlantelPage({
  params,
}: {
  params: { id: string };
}) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    // ⬇️ NO pedimos "nombre" porque no existe en tu modelo
    select: { coach: true, baseSystem: true, planReport: true },
  });

  if (!rival) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Plantel</h1>
        <p className="text-sm text-red-600 mt-2">Rival no encontrado.</p>
      </div>
    );
  }

  // planReport puede ser JSON libre; lo tratamos con cuidado
  const pr = (rival.planReport ?? {}) as any;

  // Esperamos players como un array de objetos { name, number?, position?, videoUrl? }
  const players: Array<{
    name?: string;
    number?: string | number;
    position?: string;
    videoUrl?: string;
    [k: string]: any;
  }> = Array.isArray(pr?.players) ? pr.players : [];

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Plantel</h1>
        <p className="text-sm text-gray-500">
          DT: {rival.coach ?? "—"} · Sistema base: {rival.baseSystem ?? "—"}
        </p>
      </header>

      {players.length === 0 ? (
        <div className="rounded-lg border p-6 text-gray-600">
          Aún no hay jugadores cargados en el plan. Podés subir la planilla CSV con
          el plantel para verlos aquí.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Posición</th>
                <th className="px-4 py-2">Video</th>
                {/* Más columnas que quieras agregar */}
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => {
                const num = p?.number ?? "";
                const name = p?.name ?? `Jugador ${idx + 1}`;
                const pos = p?.position ?? "";
                const videoUrl = p?.videoUrl ?? "";

                return (
                  <tr key={`${name}-${idx}`} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{num}</td>
                    <td className="px-4 py-2">{name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pos}</td>
                    <td className="px-4 py-2">
                      {videoUrl ? (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Ver video
                        </a>
                      ) : (
                        <span className="text-gray-400">Sin video</span>
                      )}
                      {/* Próximamente:
                      <form action={`/api/ct/rivales/${params.id}/player/video`} method="post" encType="multipart/form-data" className="mt-2">
                        <input type="hidden" name="playerName" value={name} />
                        <input type="url" name="videoUrl" placeholder="https://…" className="border rounded px-2 py-1 mr-2" required />
                        <button type="submit" className="px-3 py-1 rounded bg-black text-white">Guardar</button>
                      </form>
                      */}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

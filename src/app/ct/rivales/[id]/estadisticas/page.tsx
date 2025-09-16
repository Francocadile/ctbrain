import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function EstadisticasPage({ params }: { params: { id: string } }) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: { nombre: true, planReport: true, baseSystem: true, coach: true }
  });

  const pr = (rival?.planReport ?? {}) as any;
  const t = (pr.teamStats ?? {}) as any;
  const players = (pr.playerStats ?? []) as any[];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Estadísticas — {rival?.nombre ?? "Rival"}</h1>
      <div className="text-sm text-gray-600">
        <div><b>DT:</b> {rival?.coach ?? "—"}</div>
        <div><b>Sistema base:</b> {rival?.baseSystem ?? "—"}</div>
      </div>

      <section>
        <h2 className="text-xl font-medium mb-2">KPIs del equipo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(t).map(([k, v]: any) => (
            <div key={k} className="border rounded p-3">
              <div className="text-xs uppercase text-gray-500">{k}</div>
              <div className="text-lg">
                {v?.ours ?? "—"} / {v?.opp ?? "—"}
              </div>
            </div>
          ))}
          {Object.keys(t).length === 0 && <div>No hay KPIs importados.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-2">Jugadores</h2>
        {players.length === 0 ? (
          <div>No hay estadísticas de jugadores importadas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border text-left">Jugador</th>
                  <th className="p-2 border">Min</th>
                  <th className="p-2 border">G</th>
                  <th className="p-2 border">xG</th>
                  <th className="p-2 border">A</th>
                  <th className="p-2 border">xA</th>
                  <th className="p-2 border">Tiros</th>
                  <th className="p-2 border">A puerta</th>
                  <th className="p-2 border">Pases</th>
                  <th className="p-2 border">% Pases</th>
                  <th className="p-2 border">Centros</th>
                  <th className="p-2 border">% Centros</th>
                  <th className="p-2 border">Regates</th>
                  <th className="p-2 border">Reg. gan.</th>
                  <th className="p-2 border">Duelos</th>
                  <th className="p-2 border">Duelos gan.</th>
                  <th className="p-2 border">Toques área</th>
                  <th className="p-2 border">TA</th>
                  <th className="p-2 border">TR</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={i}>
                    <td className="p-2 border text-center">{p.shirt ?? "—"}</td>
                    <td className="p-2 border">{p.name}</td>
                    <td className="p-2 border text-center">{p.minutes ?? "—"}</td>
                    <td className="p-2 border text-center">{p.goals ?? "—"}</td>
                    <td className="p-2 border text-center">{p.xg ?? "—"}</td>
                    <td className="p-2 border text-center">{p.assists ?? "—"}</td>
                    <td className="p-2 border text-center">{p.xa ?? "—"}</td>
                    <td className="p-2 border text-center">{p.shots ?? "—"}</td>
                    <td className="p-2 border text-center">{p.shotsOnTarget ?? "—"}</td>
                    <td className="p-2 border text-center">{p.passes ?? "—"}</td>
                    <td className="p-2 border text-center">{p.passesAccurate ?? "—"}</td>
                    <td className="p-2 border text-center">{p.crosses ?? "—"}</td>
                    <td className="p-2 border text-center">{p.crossesAccurate ?? "—"}</td>
                    <td className="p-2 border text-center">{p.dribbles ?? "—"}</td>
                    <td className="p-2 border text-center">{p.dribblesWon ?? "—"}</td>
                    <td className="p-2 border text-center">{p.duels ?? "—"}</td>
                    <td className="p-2 border text-center">{p.duelsWon ?? "—"}</td>
                    <td className="p-2 border text-center">{p.touchesInBox ?? "—"}</td>
                    <td className="p-2 border text-center">{p.yellow ?? "—"}</td>
                    <td className="p-2 border text-center">{p.red ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

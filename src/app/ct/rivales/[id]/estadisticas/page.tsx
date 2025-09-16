// src/app/ct/rivales/[id]/estadisticas/page.tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function Estadisticas({ params }: { params: { id: string } }) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: { nombre: true, planReport: true },
  });

  const pr = (rival?.planReport ?? {}) as any;
  const team = pr.teamStats ?? {};
  const players: any[] = pr.playerStats ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Estadísticas — {rival?.nombre}</h2>

      {/* KPIs equipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["Goles", team.goals],
          ["xG", team.xg],
          ["Posesión (%)", team.possessionPct],
          ["Precisión de pases (%)", team.passAccuracyPct],
          ["Intensidad de juego", team.gameIntensity],
          ["PPDA", team.ppda],
        ].map(([label, val], i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-lg">
              {val?.ours ?? "—"} <span className="text-gray-400">/</span> {val?.opp ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla por jugador */}
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Jugador</th>
              <th className="p-2">Min</th>
              <th className="p-2">G/xG</th>
              <th className="p-2">A/xA</th>
              <th className="p-2">T/OT</th>
              <th className="p-2">P/Prec</th>
              <th className="p-2">Cent/Prec</th>
              <th className="p-2">Reg/OK</th>
              <th className="p-2">Duel/OK</th>
              <th className="p-2">Toques área</th>
              <th className="p-2">TA/TR</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2 text-gray-500">{p.shirt ?? ""}</td>
                <td className="p-2">{p.name}</td>
                <td className="p-2 text-center">{p.minutes ?? "—"}</td>
                <td className="p-2 text-center">{p.goals ?? "—"} / {p.xg ?? "—"}</td>
                <td className="p-2 text-center">{p.assists ?? "—"} / {p.xa ?? "—"}</td>
                <td className="p-2 text-center">{p.shots ?? "—"} / {p.shotsOnTarget ?? "—"}</td>
                <td className="p-2 text-center">{p.passes ?? "—"} / {p.passesAccurate ?? "—"}</td>
                <td className="p-2 text-center">{p.crosses ?? "—"} / {p.crossesAccurate ?? "—"}</td>
                <td className="p-2 text-center">{p.dribbles ?? "—"} / {p.dribblesWon ?? "—"}</td>
                <td className="p-2 text-center">{p.duels ?? "—"} / {p.duelsWon ?? "—"}</td>
                <td className="p-2 text-center">{p.touchesInBox ?? "—"}</td>
                <td className="p-2 text-center">{p.yellow ?? "—"} / {p.red ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function EstadisticasPage({ params }: { params: { id: string } }) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: { coach: true, baseSystem: true, planReport: true }
  });

  const pr = (rival?.planReport ?? {}) as any;
  const totals = (pr?.totals ?? {}) as any;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Estadísticas del rival</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card label="Entrenador" value={rival?.coach ?? "—"} />
        <Card label="Sistema base" value={rival?.baseSystem ?? pr?.system ?? "—"} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card label="GF" value={totals.gf ?? "—"} />
        <Card label="GA" value={totals.ga ?? "—"} />
        <Card label="Posesión (%)" value={totals.possession ?? "—"} />
        <Card label="Tiros" value={totals.shots ?? "—"} />
        <Card label="Tiros a puerta" value={totals.shotsOnTarget ?? "—"} />
        <Card label="xG" value={totals.xg ?? "—"} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <List label="Fortalezas" items={pr?.strengths} />
        <List label="Debilidades" items={pr?.weaknesses} />
        <List label="Jugadores clave" items={pr?.keyPlayers} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-lg font-medium">{String(value)}</div>
    </div>
  );
}

function List({ label, items }: { label: string; items?: string[] }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      {arr.length ? (
        <ul className="list-disc list-inside space-y-1">
          {arr.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <div className="text-gray-400">—</div>
      )}
    </div>
  );
}

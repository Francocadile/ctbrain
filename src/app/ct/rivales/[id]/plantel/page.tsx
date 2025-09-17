import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import PlayerList from "./player-list";

const prisma = new PrismaClient();

export default async function PlantelPage({ params }: { params: { id: string } }) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: { nombre: true as any, // por si tenés "nombre", si no, no rompe
              coach: true, baseSystem: true, planReport: true }
  });

  const pr = (rival?.planReport ?? {}) as any;
  const players: any[] = Array.isArray(pr.players) ? pr.players : [];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Plantel {rival?.nombre ? `– ${rival.nombre}` : "" }
        </h1>
        <div className="flex gap-3">
          <Link href={`/ct/rivales/${params.id}/estadisticas`} className="text-blue-600 hover:underline">
            ← Volver a Estadísticas
          </Link>
          <Link href={`/ct/rivales/${params.id}/importar`} className="text-blue-600 hover:underline">
            Importar
          </Link>
        </div>
      </div>

      <PlayerList rivalId={params.id} initialPlayers={players} />
    </div>
  );
}

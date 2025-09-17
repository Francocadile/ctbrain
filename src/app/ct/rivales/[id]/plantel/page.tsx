// src/app/ct/rivales/[id]/plantel/page.tsx
import { PrismaClient } from "@prisma/client";
import PlayerList from "./player-list";

const prisma = new PrismaClient();

export default async function PlantelPage({
  params,
}: {
  params: { id: string };
}) {
  const rival = await prisma.rival.findUnique({
    where: { id: params.id },
    select: { coach: true, baseSystem: true, planReport: true },
  });

  // planReport.players puede venir con diferentes claves; normalizamos a { player_name, position, videoUrl, ... }
  const pr = (rival?.planReport ?? {}) as Record<string, any>;
  const raw: any[] = Array.isArray(pr.players) ? pr.players : [];

  const initialPlayers = raw.map((p, i) => {
    const name =
      p?.player_name ??
      p?.name ??
      p?.player ??
      p?.nombre ??
      `Jugador ${i + 1}`;
    return {
      ...p,
      player_name: String(name || "").trim(),
    };
  });

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Plantel</h1>
        <p className="text-sm text-gray-500">
          DT: {rival?.coach ?? "—"} · Sistema base: {rival?.baseSystem ?? "—"}
        </p>
      </header>

      <PlayerList rivalId={params.id} initialPlayers={initialPlayers} />
    </div>
  );
}

import { dbScope } from "@/lib/dbScope";
import prisma from "@/lib/prisma";
import PlantelTable from "@/app/ct/plantel/components/PlantelTable";
import type { Role } from "@prisma/client";
import type { PlayerWithUser } from "@/app/ct/plantel/components/PlantelTable";

export const dynamic = "force-dynamic";

export default async function CtPlantelPage() {
  const { team } = await dbScope({ roles: ["CT", "ADMIN"] as Role[] });

  const players: PlayerWithUser[] = await (prisma as any).player.findMany({
    where: { teamId: team.id },
    include: { user: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Plantel</h1>
      <PlantelTable players={players} />
    </main>
  );
}

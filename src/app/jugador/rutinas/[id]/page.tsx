import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PlayerRoutinePageContent from "./PlayerRoutinePageContent";

export const dynamic = "force-dynamic";

export default async function JugadorRutinaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const player = (await prisma.player.findFirst({
    where: { userId: session.user.id },
  } as any)) as any;

  if (!player) {
    return notFound();
  }

  const routine = (await prisma.routine.findFirst({
    where: {
      id: params.id,
      teamId: player.teamId ?? undefined,
      OR: [
        { shareMode: "ALL_PLAYERS" },
        {
          shareMode: "SELECTED_PLAYERS",
          sharedWithPlayers: {
            some: { playerId: player.id },
          },
        },
      ],
    },
    include: {
      blocks: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  } as any)) as any;

  if (!routine) {
    return notFound();
  }

  const blocks = (routine.blocks || []) as any[];
  const items = (routine.items || []) as any[];

  const itemsByBlock: Record<string, any[]> = {};
  const unassigned: any[] = [];
  for (const it of items) {
    if (it.blockId) {
      if (!itemsByBlock[it.blockId]) itemsByBlock[it.blockId] = [];
      itemsByBlock[it.blockId].push(it);
    } else {
      unassigned.push(it);
    }
  }

  return (
    <PlayerRoutinePageContent
      routine={routine}
      blocks={blocks}
      itemsByBlock={itemsByBlock}
      unassigned={unassigned}
    />
  );
}

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("[backfill] starting scouting team backfill...");

  const targetTeam = await prisma.team.findFirst({ orderBy: { createdAt: "asc" } });
  if (!targetTeam) {
    throw new Error("No teams found in database. Cannot backfill.");
  }

  console.log(`[backfill] using team ${targetTeam.name} (${targetTeam.id})`);

  const categories = await prisma.scoutingCategory.updateMany({
    where: { teamId: null },
    data: { teamId: targetTeam.id },
  });

  const players = await prisma.scoutingPlayer.updateMany({
    where: { teamId: null },
    data: { teamId: targetTeam.id },
  });

  console.log("[backfill] summary:");
  console.log(`  ScoutingCategory updated: ${categories.count}`);
  console.log(`  ScoutingPlayer updated:   ${players.count}`);

  return { categories: categories.count, players: players.count };
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("[backfill] failed", err);
    return prisma.$disconnect().finally(() => process.exit(1));
  });

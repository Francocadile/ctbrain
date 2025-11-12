import prisma from "@/lib/prisma";

async function main() {
  // 1) Buscar un equipo existente o crear uno por defecto
  let team = await prisma.team.findFirst({
    where: { id: { not: "legacy-default-team" } },
    orderBy: { createdAt: "asc" },
  });
  if (!team) {
    team =
      (await prisma.team.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await prisma.team.create({
        data: { name: "Equipo Principal" },
      }));
  }

  // 2) Backfill teamId en Rivales
  const rivalsUpdated = await prisma.rival.updateMany({
    where: { teamId: { not: team.id } },
    data: { teamId: team.id },
  });

  // 3) Crear UserTeam si el usuario no tiene ninguno
  const users = await prisma.user.findMany({
    select: { id: true, role: true },
  });

  for (const u of users) {
    const exists = await prisma.userTeam.findFirst({
      where: { userId: u.id, teamId: team.id },
    });
    if (!exists) {
      await prisma.userTeam.create({
        data: {
          userId: u.id,
          teamId: team.id,
          role: (u.role as any) ?? "CT",
        },
      });
    }
  }

  console.log(
    `Backfill completado. TEAM: ${team.id}. Rivales actualizados: ${rivalsUpdated.count}`
  );
}

main().finally(() => prisma.$disconnect());

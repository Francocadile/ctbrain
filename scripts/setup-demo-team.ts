import { hash } from "bcryptjs";
import { Role, TeamRole } from "@prisma/client";
import prisma from "@/lib/prisma";

const TEAM_NAME = "Demo";

function slugify(input: string) {
  return (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "equipo";
}

const USERS: Array<{
  email: string;
  password: string;
  role: Role;
  teamRole: TeamRole;
  name: string;
}> = [
  {
    email: "superadmin@demo.com",
    password: "123123",
    role: Role.SUPERADMIN,
    teamRole: TeamRole.ADMIN,
    name: "Superadmin Demo",
  },
  {
    email: "admin@demo.com",
    password: "123123",
    role: Role.ADMIN,
    teamRole: TeamRole.ADMIN,
    name: "Admin Demo",
  },
  {
    email: "ct@demo.com",
    password: "123123",
    role: Role.CT,
    teamRole: TeamRole.CT,
    name: "Cuerpo Técnico Demo",
  },
  {
    email: "jugador@demo.com",
    password: "123123",
    role: Role.JUGADOR,
    teamRole: TeamRole.JUGADOR,
    name: "Jugador Demo",
  },
  {
    email: "medico@demo.com",
    password: "123123",
    role: Role.MEDICO,
    teamRole: TeamRole.MEDICO,
    name: "Médico Demo",
  },
  {
    email: "directivo@demo.com",
    password: "123123",
    role: Role.DIRECTIVO,
    teamRole: TeamRole.DIRECTIVO,
    name: "Directivo Demo",
  },
];

async function main() {
  const teamSlug = slugify(TEAM_NAME);
  const team = await prisma.team.upsert({
    where: { name: TEAM_NAME },
    update: {
      slug: teamSlug,
    },
    create: { name: TEAM_NAME, slug: teamSlug, isActive: true },
  });

  for (const { email, password, role, teamRole, name } of USERS) {
    const passwordHash = await hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role,
        passwordHash,
        isApproved: true,
      },
      create: {
        email,
        name,
        role,
        passwordHash,
        isApproved: true,
      },
    });

    await prisma.userTeam.upsert({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: team.id,
        },
      },
      update: {
        role: teamRole,
      },
      create: {
        userId: user.id,
        teamId: team.id,
        role: teamRole,
      },
    });
  }

  console.log(`Equipo demo listo: ${team.id}`);
}

main()
  .catch((error) => {
    console.error("Error preparando el equipo Demo", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// scripts/createUserTeam.ts
import prisma from "../src/lib/prisma";

async function main() {
  const userId = process.env.USER_ID;
  const teamId = process.env.TEAM_ID;
  if (!userId || !teamId) {
    throw new Error("Faltan USER_ID o TEAM_ID en el entorno");
  }
  const userTeam = await prisma.userTeam.create({
    data: {
      userId,
      teamId,
      role: "ADMIN",
    },
  });
  console.log("UserTeam creado:", userTeam);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

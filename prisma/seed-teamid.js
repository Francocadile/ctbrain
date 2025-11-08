// prisma/seed-teamid.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Busca el usuario CT
  const ct = await prisma.user.findFirst({ where: { role: "CT" } });
  if (!ct) throw new Error("No existe usuario CT");

  // Busca o crea un equipo demo
  let team = await prisma.team.findFirst();
  if (!team) {
    team = await prisma.team.create({ data: { name: "Equipo Demo" } });
  }

  // Asigna el teamId al usuario CT
  await prisma.user.update({ where: { id: ct.id }, data: { teamId: team.id } });
  console.log(`Asignado teamId (${team.id}) al usuario CT (${ct.email})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

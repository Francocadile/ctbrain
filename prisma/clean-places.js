// prisma/clean-places.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Busca el usuario CT
  const ct = await prisma.user.findFirst({ where: { role: "CT" } });
  if (!ct || !ct.teamId) throw new Error("Usuario CT sin teamId");

  // Elimina todos los lugares que tengan un teamId distinto al del CT
  const deleted = await prisma.place.deleteMany({ where: { teamId: { not: ct.teamId } } });
  console.log(`Lugares eliminados: ${deleted.count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

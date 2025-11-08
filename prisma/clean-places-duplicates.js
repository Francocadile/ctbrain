// prisma/clean-places-duplicates.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Busca el usuario CT
  const ct = await prisma.user.findFirst({ where: { role: "CT" } });
  if (!ct || !ct.teamId) throw new Error("Usuario CT sin teamId");

  // Busca todos los lugares del equipo CT
  const places = await prisma.place.findMany({ where: { teamId: ct.teamId } });
  const seen = new Set();
  let deletedCount = 0;

  for (const place of places) {
    const key = place.name.trim().toLowerCase();
    if (seen.has(key)) {
      await prisma.place.delete({ where: { id: place.id } });
      deletedCount++;
    } else {
      seen.add(key);
    }
  }
  console.log(`Lugares duplicados eliminados: ${deletedCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

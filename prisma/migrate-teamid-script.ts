const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Obtener el primer equipo existente
  const team = await prisma.team.findFirst();
  if (!team) {
    throw new Error('No hay equipos en la base de datos. Crea al menos uno antes de migrar.');
  }

  // Actualizar Sessions sin teamId
  const sessions = await prisma.session.findMany({ where: { teamId: null } });
  for (const s of sessions) {
    await prisma.session.update({ where: { id: s.id }, data: { teamId: team.id } });
  }

  // Actualizar Exercises sin teamId
  const exercises = await prisma.exercise.findMany({ where: { teamId: null } });
  for (const e of exercises) {
    await prisma.exercise.update({ where: { id: e.id }, data: { teamId: team.id } });
  }

  console.log('Migración completada: Sessions y Exercises ahora tienen teamId.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

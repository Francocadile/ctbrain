// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Credenciales desde .env (con defaults por si faltan)
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@ctbrain.com";
  const ADMIN_PASS  = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const ADMIN_NAME  = process.env.SEED_ADMIN_NAME || "Administrador CTBrain";

  // Hash
  const adminHash = await bcrypt.hash(ADMIN_PASS, 10);

  // Admin (idempotente)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      role: "ADMIN",
      password: adminHash,
    },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      password: adminHash,
    },
  });


  // SUPERADMIN
  const SUPERADMIN_EMAIL = "superadmin@superadmin.com";
  const SUPERADMIN_PASS = "123456";
  const SUPERADMIN_NAME = "Superadmin";
  const superadminHash = await bcrypt.hash(SUPERADMIN_PASS, 10);
  await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: {
      name: SUPERADMIN_NAME,
      role: "SUPERADMIN",
      password: superadminHash,
      isApproved: true,
    },
    create: {
      email: SUPERADMIN_EMAIL,
      name: SUPERADMIN_NAME,
      role: "SUPERADMIN",
      password: superadminHash,
      isApproved: true,
    },
  });

  // Usuarios de ejemplo (idempotentes)
  const samples = [
    { email: "ct@ctbrain.com",       name: "Cuerpo Técnico", role: "CT",       pass: "Ct12345!" },
    { email: "medico@ctbrain.com",   name: "Cuerpo Médico",  role: "MEDICO",   pass: "Med12345!" },
    { email: "jugador@ctbrain.com",  name: "Jugador Demo",   role: "JUGADOR",  pass: "Jug12345!" },
    { email: "directivo@ctbrain.com",name: "Directivo Demo", role: "DIRECTIVO",pass: "Dir12345!" },
  ];

  for (const u of samples) {
    const hash = await bcrypt.hash(u.pass, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hash,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hash,
      },
    });
  }

  console.log("✅ Seed completado: admin + usuarios demo creados/actualizados.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

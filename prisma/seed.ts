// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/* ===== Utils ===== */
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
const rndInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ===== Config ===== */
const DO_DEMO = process.env.SEED_DEMO === "1" || process.env.SEED_DEMO === "true";
const DEMO_NAMES = (process.env.SEED_DEMO_NAMES || "Juan Pérez,Carlos Díaz,Martín Gómez,Lucas Soto,Nicolás Ruiz,Pedro Silva")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function seedAdmin() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ctbrain.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";

  // 🔒 bcrypt hash solo para seed (el login real no lo usa aún)
  const passwordHash = await hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: passwordHash,
      role: Role.ADMIN,
      isApproved: true,
    },
  });

  console.log("✅ Admin creado/actualizado:", { email: admin.email, role: admin.role });
}

async function ensurePlayers() {
  for (const name of DEMO_NAMES) {
    const email = `${name.replace(/\s+/g, ".").toLowerCase()}@ctbrain.dev`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role: Role.JUGADOR, isApproved: true },
    });
  }
  const users = await prisma.user.findMany({ where: { email: { endsWith: "@ctbrain.dev" } } });
  console.log(`👥 Jugadores demo: ${users.length}`);
  return users;
}

async function seedWellnessAndRPE(users: { id: string }[]) {
  const today = new Date();
  const start = addDays(today, -27);

  for (const u of users) {
    for (let i = 0; i < 28; i++) {
      const d = addDays(start, i);
      const ymd = new Date(toYMD(d));

      const jitter = () => clamp(3 + Math.random() * 2, 1, 5);
      const sleepH = Math.round((6 + Math.random() * 3) * 10) / 10;

      await prisma.wellnessEntry.upsert({
        where: { userId_date: { userId: u.id, date: ymd } },
        update: {},
        create: {
          userId: u.id,
          date: ymd,
          sleepQuality: Math.round(jitter()),
          sleepHours: sleepH,
          fatigue: Math.round(jitter()),
          muscleSoreness: Math.round(jitter()),
          stress: Math.round(jitter()),
          mood: Math.round(jitter()),
        },
      });
    }

    for (const offset of [-1, 0]) {
      const ymd = new Date(toYMD(addDays(today, offset)));
      const rpe = Math.round(5 + Math.random() * 3);
      const minutes = [75, 90, 95, 100][rndInt(0, 3)];

      await prisma.rPEEntry.upsert({
        where: { userId_date_session: { userId: u.id, date: ymd, session: 1 } },
        update: { rpe, duration: minutes, load: rpe * minutes },
        create: {
          userId: u.id,
          date: ymd,
          session: 1,
          rpe,
          duration: minutes,
          load: rpe * minutes,
        },
      });
    }
  }

  console.log("📊 Seed demo: wellness (28d) + rpe (ayer/hoy) cargados.");
}

async function main() {
  await seedAdmin();
  await seedCoreUsers();
  if (DO_DEMO) {
    const players = await ensurePlayers();
    if (players.length) await seedWellnessAndRPE(players);
  } else {
    console.log("ℹ️ SEED_DEMO no activo. Solo se creó el admin y los usuarios principales.");
  }
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

// Crea los 4 usuarios principales
async function seedCoreUsers() {
  const users = [
    { email: "superadmin@superadmin.com", password: "123456", role: Role.SUPERADMIN, name: "Superadmin" },
    { email: "jugador@jugador.com", password: "123456", role: Role.JUGADOR, name: "Jugador" },
    { email: "ct@ct.com", password: "123456", role: Role.CT, name: "Cuerpo Técnico" },
    { email: "medico@medico.com", password: "123456", role: Role.MEDICO, name: "Médico" },
    { email: "admin@admin.com", password: "123456", role: Role.ADMIN, name: "Administrador" },
  ];
  for (const u of users) {
    const passwordHash = await hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: passwordHash,
        role: u.role,
        isApproved: true,
      },
    });
    console.log(`✅ Usuario creado/actualizado: ${u.email} (${u.role})`);
  }
}

// package.json scripts
// "db:seed": "tsx prisma/seed.ts"

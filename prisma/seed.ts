// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/* ===== Utils cortas ===== */
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function clamp(n:number,min:number,max:number){ return Math.max(min, Math.min(max, n)); }
const rndInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ===== Config por env ===== */
const DO_DEMO = process.env.SEED_DEMO === "1" || process.env.SEED_DEMO === "true";
const DEMO_NAMES = (process.env.SEED_DEMO_NAMES || "Juan Pérez,Carlos Díaz,Martín Gómez,Lucas Soto,Nicolás Ruiz,Pedro Silva")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

async function seedAdmin() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ctbrain.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";

  const passwordHash = await hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log("✅ Admin creado/actualizado:", { id: admin.id, email: admin.email, role: admin.role });
}

async function ensurePlayers() {
  // Crea jugadores demo si no existen
  for (const name of DEMO_NAMES) {
    const email = `${name.replace(/\s+/g,'.').toLowerCase()}@ctbrain.dev`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role: Role.JUGADOR },
    });
  }
  const users = await prisma.user.findMany({ where: { email: { endsWith: "@ctbrain.dev" } } });
  console.log(`👥 Jugadores demo: ${users.length}`);
  return users;
}

async function seedWellnessAndRPE(users: { id: string }[]) {
  const today = new Date();
  const start = addDays(today, -27); // 28 días (para baseline 21d)

  for (const u of users) {
    // WELLNESS: 28 días con pequeñas variaciones “realistas”
    for (let i = 0; i < 28; i++) {
      const d = addDays(start, i);
      const ymd = toYMD(d);

      // valores entre 3 y 5 mayormente, con algo de ruido
      const base = 4;
      const jitter = () => clamp(base + (Math.random()*2 - 1), 1, 5);
      const sleepH = Math.round((6 + Math.random()*3) * 10) / 10; // 6–9 h

      // Usamos upsert con unique compuesto (userId,date).
      // Si tu schema no lo tiene, cambialo por findFirst+create/update.
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
          comment: null,
        },
      });
    }

    // RPE: ayer y hoy (para ver “Hoy vs Ayer” en el widget)
    for (const offset of [-1, 0]) {
      const ymd = toYMD(addDays(today, offset));
      const rpe = Math.round((5 + Math.random()*3) * 10) / 10; // 5–8
      const minutes = [75, 90, 95, 100][rndInt(0, 3)];

      await prisma.rPEEntry.upsert({
        where: { userId_date: { userId: u.id, date: ymd } },
        update: { rpe, duration: minutes, load: Math.round(rpe * minutes) },
        create: {
          userId: u.id,
          date: ymd,
          rpe,
          duration: minutes,
          load: Math.round(rpe * minutes),
        },
      });
    }
  }

  console.log("📊 Seed demo: wellness (28d) + rpe (ayer/hoy) cargados.");
}

async function main() {
  await seedAdmin();

  if (DO_DEMO) {
    const players = await ensurePlayers();
    if (players.length) {
      await seedWellnessAndRPE(players);
    }
  } else {
    console.log("ℹ️ SEED_DEMO no está activo (SEED_DEMO=1). Solo se creó/actualizó el admin.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

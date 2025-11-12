// src/app/api/dev/seed/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function clamp(n:number,min:number,max:number){ return Math.max(min, Math.min(max, n)); }
const rndInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function upsertAdmin() {
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@ctbrain.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const passwordHash = await hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: Role.ADMIN },
    create: { name, email, passwordHash, role: Role.ADMIN },
  });
  return { id: admin.id, email: admin.email };
}

async function ensurePlayers(names: string[]) {
  for (const name of names) {
    const email = `${name.replace(/\s+/g, ".").toLowerCase()}@ctbrain.dev`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role: Role.JUGADOR },
    });
  }
  return prisma.user.findMany({ where: { email: { endsWith: "@ctbrain.dev" } } });
}

async function upsertWellness(userId: string, date: string, data: any) {
  const found = await prisma.wellnessEntry.findFirst({ where: { userId, date } });
  if (found) {
    await prisma.wellnessEntry.update({ where: { id: found.id }, data });
  } else {
    await prisma.wellnessEntry.create({ data: { userId, date, ...data } });
  }
}

async function upsertRPE(userId: string, date: string, data: any) {
  const found = await prisma.rPEEntry.findFirst({ where: { userId, date } });
  if (found) {
    await prisma.rPEEntry.update({ where: { id: found.id }, data });
  } else {
    await prisma.rPEEntry.create({ data: { userId, date, ...data } });
  }
}

export async function GET(req: NextRequest) {
  // Seguridad básica: requerir token
  const token = new URL(req.url).searchParams.get("token");
  const expected = process.env.SEED_TOKEN || "dev";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const demo = new URL(req.url).searchParams.get("demo") === "1";
  const namesParam = process.env.SEED_DEMO_NAMES || "Juan Pérez,Carlos Díaz,Martín Gómez,Lucas Soto,Nicolás Ruiz,Pedro Silva";
  const DEMO_NAMES = namesParam.split(",").map(s => s.trim()).filter(Boolean);

  try {
    const admin = await upsertAdmin();

    let players: { id: string; name: string | null }[] = [];
    if (demo) {
      players = await ensurePlayers(DEMO_NAMES);

      const today = new Date();
      const start = addDays(today, -27); // 28 días
      for (const p of players) {
        // WELLNESS 28d
        for (let i = 0; i < 28; i++) {
          const d = addDays(start, i);
          const ymd = toYMD(d);
          const base = 4;
          const jitter = () => clamp(base + (Math.random() * 2 - 1), 1, 5);
          const sleepH = Math.round((6 + Math.random() * 3) * 10) / 10; // 6–9h

          await upsertWellness(p.id, ymd, {
            sleepQuality: Math.round(jitter()),
            sleepHours: sleepH,
            fatigue: Math.round(jitter()),
            muscleSoreness: Math.round(jitter()),
            stress: Math.round(jitter()),
            mood: Math.round(jitter()),
            comment: null,
          });
        }

        // RPE ayer y hoy
        for (const offset of [-1, 0]) {
          const ymd = toYMD(addDays(today, offset));
          const rpe = Math.round((5 + Math.random() * 3) * 10) / 10; // 5–8
          const minutes = [75, 90, 95, 100][rndInt(0, 3)];
          await upsertRPE(p.id, ymd, {
            rpe,
            duration: minutes,
            load: Math.round(rpe * minutes),
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      admin,
      demo: !!demo,
      players: players.length,
      note: "Seed ejecutado",
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Seed error" }, { status: 500 });
  }
}

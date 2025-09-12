// src/app/api/ct/rpe/bulk/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions"; // ajusta si tu authOptions está en otra ruta
import { prisma } from "@/lib/prisma";

type BulkItem = {
  playerId: string;
  rpe: number;          // 0..10 (entero)
  duration?: number;    // minutos
  comment?: string;     // opcional
};

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

function parseYMD(ymd?: string) {
  // Espera "YYYY-MM-DD". Si no llega, usa "hoy" en UTC.
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const s = ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : `${yyyy}-${mm}-${dd}`;
  // Usamos medianoche UTC de ese día
  const start = new Date(`${s}T00:00:00.000Z`);
  const end = new Date(`${s}T23:59:59.999Z`);
  return { s, start, end };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || undefined;
    const { start, end, s } = parseYMD(dateStr);

    // Jugadores
    const players = await prisma.user.findMany({
      where: { role: "JUGADOR" },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    // RPE existentes para la fecha
    const rpe = await prisma.rPEEntry.findMany({
      where: { date: { gte: start, lte: end } },
      select: { id: true, userId: true, rpe: true, duration: true, load: true, updatedAt: true },
    });

    // Clinical del día (para chips de disponibilidad)
    const clinical = await prisma.clinicalEntry.findMany({
      where: { date: { gte: start, lte: end } },
      select: { userId: true, status: true },
    });

    return NextResponse.json({
      ok: true,
      date: s,
      players,
      rpe,
      clinical,
    });
  } catch (err: any) {
    console.error("GET /api/ct/rpe/bulk", err);
    return bad("Error al cargar datos", 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["CT", "ADMIN"].includes((session.user as any)?.role)) {
      return bad("Unauthorized", 401);
    }

    const body = await req.json();
    const dateStr: string | undefined = body?.date;
    const items: BulkItem[] = Array.isArray(body?.items) ? body.items : [];

    const { start } = parseYMD(dateStr);

    if (!items.length) return bad("No hay items para guardar");

    // Validaciones simples
    const errors: { playerId: string; message: string }[] = [];
    const clean: BulkItem[] = [];

    for (const it of items) {
      if (!it?.playerId) {
        errors.push({ playerId: "unknown", message: "Falta playerId" });
        continue;
      }
      const rpe = Number(it.rpe);
      if (!Number.isFinite(rpe) || rpe < 0 || rpe > 10 || !Number.isInteger(rpe)) {
        errors.push({ playerId: it.playerId, message: "RPE inválido (0–10, entero)" });
        continue;
      }
      let duration: number | undefined = undefined;
      if (it.duration !== undefined && it.duration !== null) {
        const d = Number(it.duration);
        if (!Number.isFinite(d) || d < 0 || d > 300) {
          errors.push({ playerId: it.playerId, message: "Duración fuera de rango (0–300)" });
          continue;
        }
        duration = Math.round(d);
      }
      let comment = (it.comment ?? "").toString().trim();
      if (comment.length > 280) comment = comment.slice(0, 280);

      clean.push({ playerId: it.playerId, rpe, duration, comment });
    }

    let saved = 0;

    // Upsert por (userId, date) — tu modelo tiene @@unique([userId, date])
    await prisma.$transaction(
      clean.map((it) =>
        prisma.rPEEntry.upsert({
          where: {
            userId_date: {
              userId: it.playerId,
              date: start,
            },
          },
          update: {
            rpe: it.rpe,
            duration: it.duration ?? null,
            // Carga (load) opcional = rpe * duración si viene duración:
            load: it.duration != null ? it.rpe * it.duration : null,
            // comment no existe en tu modelo; si lo necesitás, lo agregamos en migración futura
          },
          create: {
            userId: it.playerId,
            date: start,
            rpe: it.rpe,
            duration: it.duration ?? null,
            load: it.duration != null ? it.rpe * it.duration : null,
          },
        })
      )
    ).then(() => {
      saved = clean.length;
    });

    return NextResponse.json({ ok: true, saved, errors });
  } catch (err: any) {
    console.error("POST /api/ct/rpe/bulk", err);
    // Prisma unique constraint → mensaje amigable
    return bad("Error al guardar RPE (revisá datos y reintentá)", 500);
  }
}

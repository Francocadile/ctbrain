// src/app/api/sessions/week/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Util: obtener lunes como inicio de semana (Monday-based)
function getMonday(d: Date) {
  const day = d.getUTCDay(); // 0..6 (0 = Sunday)
  const diff = (day === 0 ? -6 : 1 - day); // mover a Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export async function GET(req: Request) {
  try {
    const session = (await getServerSession()) as any;
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    // Opcional: start=YYYY-MM-DD (se interpretará como fecha UTC)
    const startParam = url.searchParams.get("start"); // ej: 2025-08-25
    const base = startParam ? new Date(`${startParam}T00:00:00.000Z`) : new Date();
    const weekStart = getMonday(base);              // lunes 00:00 UTC
    const weekEndExclusive = addDaysUTC(weekStart, 7); // próximo lunes

    const items = await prisma.session.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: weekEndExclusive,
        },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        createdBy: { select: { id: true, name: true, email: true } },
        players: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Agrupar por día YYYY-MM-DD (UTC)
    const days: Record<
      string,
      Array<{
        id: string;
        title: string;
        description: string | null;
        date: string; // ISO
        createdBy: { id: string; name: string | null; email: string | null } | null;
        players: Array<{ id: string; name: string | null; email: string | null; role: string }>;
      }>
    > = {};

    for (let i = 0; i < 7; i++) {
      const d = addDaysUTC(weekStart, i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      days[key] = [];
    }

    items.forEach((s) => {
      const key = new Date(s.date).toISOString().slice(0, 10);
      if (!days[key]) days[key] = [];
      days[key].push({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        date: new Date(s.date).toISOString(),
        createdBy: s.createdBy
          ? {
              id: s.createdBy.id,
              name: s.createdBy.name ?? null,
              email: s.createdBy.email ?? null,
            }
          : null,
        players: s.players.map((p) => ({
          id: p.id,
          name: p.name ?? null,
          email: p.email ?? null,
          role: p.role,
        })),
      });
    });

    return NextResponse.json({
      weekStart: weekStart.toISOString().slice(0, 10), // YYYY-MM-DD
      weekEnd: addDaysUTC(weekStart, 6).toISOString().slice(0, 10),
      days,
    });
  } catch (err) {
    console.error("GET /api/sessions/week error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// src/app/api/sessions/week/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// --- Util: obtener lunes como inicio de semana (Monday-based, UTC) ---
function getMonday(d: Date) {
  const day = d.getUTCDay(); // 0..6 (0 = Sunday)
  const diff = day === 0 ? -6 : 1 - day; // mover a Monday
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

// --- Select unificado ---
const sessionSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  createdBy: true, // string (userId)
  user: { select: { id: true, name: true, email: true, role: true } },
  players: { select: { id: true, name: true, email: true, role: true } }, // NUEVO
} as const;

export async function GET(req: Request) {
  try {
    const session = (await getServerSession()) as any;
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const startParam = url.searchParams.get("start"); // YYYY-MM-DD
    const base = startParam ? new Date(`${startParam}T00:00:00.000Z`) : new Date();
    const weekStart = getMonday(base);                 // lunes 00:00 UTC
    const weekEndExclusive = addDaysUTC(weekStart, 7); // próximo lunes (exclusivo)

    const items = await prisma.session.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: weekEndExclusive,
        },
      },
      orderBy: { date: "asc" },
      select: sessionSelect,
      take: 200,
    });

    // Armar estructura por día YYYY-MM-DD (UTC)
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

    // Inicializar los 7 días
    for (let i = 0; i < 7; i++) {
      const d = addDaysUTC(weekStart, i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      days[key] = [];
    }

    // Mapear resultados
    items.forEach((s) => {
      const key = new Date(s.date).toISOString().slice(0, 10);
      if (!days[key]) days[key] = [];
      days[key].push({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        date: new Date(s.date).toISOString(),
        createdBy: s.user
          ? { id: s.user.id, name: s.user.name ?? null, email: s.user.email ?? null }
          : null,
        players: (s.players ?? []).map((p) => ({
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

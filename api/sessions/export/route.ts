// src/app/api/sessions/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithRoles } from "@/lib/auth-helpers";

function toYMDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getMondayUTC(base: Date) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = d.getUTCDay() || 7; // 1..7
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireSessionWithRoles(["CT", "ADMIN"]);

  const url = new URL(req.url);
  const start = url.searchParams.get("start"); // YYYY-MM-DD opcional

  const base = start ? new Date(`${start}T00:00:00.000Z`) : new Date();
  const weekStart = getMondayUTC(base);
  const nextMonday = new Date(weekStart);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  const rows = await prisma.session.findMany({
    where: { date: { gte: weekStart, lt: nextMonday } },
    orderBy: { date: "asc" },
  });

  // Export “neutro”: sin ids ni timestamps (útil para importar en otra semana)
  const sessions = rows.map((r) => ({
    title: r.title ?? "",
    description: r.description ?? "",
    date: r.date.toISOString(), // conservamos ISO original por si lo querés importar tal cual
    type: r.type as any,
    createdBy: r.createdBy ?? null,
  }));

  return NextResponse.json({
    version: 1,
    weekStart: toYMDUTC(weekStart),
    weekEnd: toYMDUTC(new Date(nextMonday.getTime() - 24 * 3600 * 1000)), // domingo
    count: sessions.length,
    sessions,
  });
}

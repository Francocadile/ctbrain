// src/app/api/sessions/duplicate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithRoles } from "@/lib/auth-helpers";

function ymdToDateUTC(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function getMondayUTC(base: Date) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  if (dow !== 1) d.setUTCDate(d.getUTCDate() - (dow - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await requireSessionWithRoles(["CT", "ADMIN"]);

  const body = await req.json().catch(() => ({}));
  const fromStart: string | null = body.fromStart || null; // YYYY-MM-DD (lunes o cualquier día)
  const toStart: string | null = body.toStart || null;
  const overwrite: boolean = Boolean(body.overwrite); // si true, borra destino antes de copiar
  const createdBy: string | null = body.createdBy ?? null;

  if (!fromStart || !toStart) {
    return NextResponse.json(
      { error: "Faltan parámetros: fromStart y toStart" },
      { status: 400 }
    );
  }

  const srcMonday = getMondayUTC(ymdToDateUTC(fromStart));
  const srcNext = addDaysUTC(srcMonday, 7);
  const dstMonday = getMondayUTC(ymdToDateUTC(toStart));
  const dstNext = addDaysUTC(dstMonday, 7);

  const diffDays = Math.round(
    (dstMonday.getTime() - srcMonday.getTime()) / (24 * 3600 * 1000)
  );

  // Limpiar destino si se pide
  let deleted = 0;
  if (overwrite) {
    const del = await prisma.session.deleteMany({
      where: { date: { gte: dstMonday, lt: dstNext } },
    });
    deleted = del.count;
  }

  // Traer fuente
  const rows = await prisma.session.findMany({
    where: { date: { gte: srcMonday, lt: srcNext } },
    orderBy: { date: "asc" },
  });

  // Insertar en destino con corrimiento
  let created = 0;
  for (const r of rows) {
    const newDate = addDaysUTC(r.date, diffDays);
    await prisma.session.create({
      data: {
        title: r.title ?? "",
        description: r.description ?? "",
        date: newDate,
        type: r.type as any,
        createdBy: createdBy ?? r.createdBy ?? null,
      },
    });
    created++;
  }

  return NextResponse.json({
    ok: true,
    fromWeek: fromStart,
    toWeek: toStart,
    deleted,
    created,
  });
}

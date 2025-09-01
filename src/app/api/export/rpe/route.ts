// src/app/api/export/rpe/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD
  const end = searchParams.get("end");     // YYYY-MM-DD
  const player = searchParams.get("player"); // optional (name or email)

  if (!start || !end) {
    return NextResponse.json({ error: "Parámetros requeridos: start, end" }, { status: 400 });
  }

  const where: any = { date: { gte: start, lte: end } };
  if (player) {
    where.user = {
      is: {
        OR: [
          { name:  { equals: player, mode: "insensitive" } },
          { email: { equals: player, mode: "insensitive" } },
        ],
      },
    };
  }

  const items = await prisma.rPEEntry.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  const rows = items.map((r) => {
    const rpe = Number(r.rpe ?? 0);
    const minutes = r.duration != null ? Number(r.duration) : "";
    const load = (r as any).load ?? (r as any).srpe ?? (r.duration != null ? Math.round(rpe * Number(r.duration)) : "");

    return {
      Jugador: r.user?.name || r.user?.email || "—",
      Email: r.user?.email || "",
      Fecha: r.date,
      RPE: rpe || "",
      Minutos: minutes,
      sRPE_AU: load ?? "",
      Comentario: (r as any).comment ?? "",
    };
  });

  const csv = toCsv(rows);
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="rpe_${start}_a_${end}.csv"`,
    "Cache-Control": "no-store",
  });
  return new NextResponse(csv, { status: 200, headers });
}

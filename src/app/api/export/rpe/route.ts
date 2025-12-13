// src/app/api/export/rpe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentTeamId } from "@/lib/sessionScope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD
  const end = searchParams.get("end");     // YYYY-MM-DD
  const player = searchParams.get("player"); // optional (name or email)

  if (!start || !end) {
    return NextResponse.json({ error: "Parámetros requeridos: start, end" }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const role = session.user.role as Role | undefined;
  if (!role) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const where: any = { date: { gte: start, lte: end } };
  let restrictByTeam = false;

  if (role === Role.SUPERADMIN) {
    // SUPERADMIN puede exportar globalmente; opcionalmente podra filtrar por teamId si lo pasamos.
  } else {
    // Staff y resto: siempre restringimos al team actual.
    const teamId = getCurrentTeamId(session);
    if (!teamId) {
      return NextResponse.json({ error: "TEAM_REQUIRED" }, { status: 428 });
    }
    restrictByTeam = true;
    where.user = {
      ...(where.user || {}),
      is: {
        ...(where.user?.is || {}),
        teams: {
          some: { teamId },
        },
      },
    };
  }

  if (player) {
    where.user = {
      ...(where.user || {}),
      is: {
        ...(where.user?.is || {}),
        OR: [
          { name: { equals: player, mode: "insensitive" } },
          { email: { equals: player, mode: "insensitive" } },
        ],
        ...(restrictByTeam
          ? {
              teams: {
                some: { teamId: getCurrentTeamId(session) ?? undefined },
              },
            }
          : {}),
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

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { dbScope, scopedWhere } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// Buenos Aires day boundaries (matches other metrics logic in the repo)
const BA_TZ = "America/Argentina/Buenos_Aires";

function startOfDayInTZ(ymd: string, timeZone: string): Date {
  // Interpret ymd as midnight in the given TZ, then convert to UTC instant.
  // We do this by formatting a UTC date in the target TZ and adjusting with the offset.
  // Simpler/robust approach: use Intl to get the offset at that local midnight.
  const [y, m, d] = ymd.split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(utcMidnight)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  // This is the target TZ local time corresponding to utcMidnight.
  // Compute offset = (local-as-utc) - utcMidnight.
  const localAsUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = localAsUTC - utcMidnight.getTime();

  // utcMidnight - offsetMs yields the UTC instant for TZ midnight.
  return new Date(utcMidnight.getTime() - offsetMs);
}

export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req });

    const url = new URL(req.url);
    const ymd = url.searchParams.get("ymd");
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return NextResponse.json({ error: "ymd inválido (YYYY-MM-DD)" }, { status: 400 });
    }

    const start = startOfDayInTZ(ymd, BA_TZ);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const where: Prisma.SessionWhereInput = {
      date: { gte: start, lt: end },
    };

    const items = await prisma.session.findMany({
      where: scopedWhere(team.id, where) as Prisma.SessionWhereInput,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ ymd, timeZone: BA_TZ, start: start.toISOString(), end: end.toISOString(), data: items });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("GET /api/sessions/by-day error:", e);
    return NextResponse.json({ error: "Error al obtener sesiones por día" }, { status: 500 });
  }
}

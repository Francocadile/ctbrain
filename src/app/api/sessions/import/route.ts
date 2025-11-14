// src/app/api/sessions/import/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope, scopedCreateArgs } from "@/lib/dbScope";

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
  try {
    const { prisma, team, user } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const body = await req.json().catch(() => ({}));

    // Formatos aceptados:
    // A) { sessions: [{title, description, date(ISO), type, createdBy?}], targetStart?: "YYYY-MM-DD" }
    // B) { version, weekStart, sessions: [...], targetStart?: "YYYY-MM-DD" }
    const sessions: any[] = Array.isArray(body.sessions) ? body.sessions : [];
    const targetStart: string | null = body.targetStart || null;

    if (!sessions.length) {
      return NextResponse.json({ error: "Payload vacío: sessions[]" }, { status: 400 });
    }

    const fallbackCreatedBy: string = user.id;

    if (!targetStart) {
      const created = [];
      for (const s of sessions) {
        const iso = s.date ? new Date(s.date) : new Date();
        if (isNaN(iso.getTime())) continue;
        const row = await prisma.session.create(
          scopedCreateArgs(team.id, {
            data: {
              title: String(s.title ?? ""),
              description: String(s.description ?? ""),
              date: iso,
              type: s.type ?? null,
              createdBy: s.createdBy ?? fallbackCreatedBy,
            },
          })
        );
        created.push(row.id);
      }
      return NextResponse.json({ ok: true, created: created.length });
    }

    // Con targetStart: realinear por diferencia entre lunes origen y lunes destino
    let sourceMonday: Date;
    if (body.weekStart) {
      sourceMonday = ymdToDateUTC(body.weekStart);
    } else {
      const minISO = sessions
        .map((s) => new Date(s.date))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      sourceMonday = getMondayUTC(minISO || new Date());
    }
    const targetMonday = getMondayUTC(ymdToDateUTC(targetStart));
    const diffDays = Math.round(
      (targetMonday.getTime() - sourceMonday.getTime()) / (24 * 3600 * 1000)
    );

    const created = [];
    for (const s of sessions) {
      const src = new Date(s.date);
      if (isNaN(src.getTime())) continue;
      const newDate = addDaysUTC(src, diffDays);
      const row = await prisma.session.create(
        scopedCreateArgs(team.id, {
          data: {
            title: String(s.title ?? ""),
            description: String(s.description ?? ""),
            date: newDate,
            type: s.type ?? null,
            createdBy: s.createdBy ?? fallbackCreatedBy,
          },
        })
      );
      created.push(row.id);
    }

    return NextResponse.json({ ok: true, created: created.length, diffDays });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("POST /api/sessions/import error", error);
    return NextResponse.json({ error: "No se pudo importar sesiones" }, { status: 500 });
  }
}

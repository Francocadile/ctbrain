// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth, requireSessionWithRoles } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

// --- Validaciones ---
const createSessionSchema = z.object({
  title: z.string().min(2, "Título muy corto"),
  description: z.string().optional().nullable(),
  date: z
    .string()
    .datetime({ message: "Fecha inválida (usar ISO, ej: 2025-08-27T12:00:00Z)" }),
  type: z
    .enum(["GENERAL", "FUERZA", "TACTICA", "AEROBICO", "RECUPERACION"])
    .optional(),
});

// --- Fechas ---
function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getMondayUTC(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; // 1..7 (Dom=7)
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1)); // ir a lunes
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// --- Select ---
const sessionSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  user: { select: { id: true, name: true, email: true, role: true } },
} as const;

// GET /api/sessions?start=YYYY-MM-DD  (semana)  |  fallback: últimas 50 (SOLO DAYNAME)
export async function GET(req: Request) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const start = url.searchParams.get("start");

    if (start) {
      // ------- SEMANA (editor) -------
      const startDate = new Date(`${start}T00:00:00.000Z`);
      if (Number.isNaN(startDate.valueOf())) {
        return NextResponse.json(
          { error: "start inválido (YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      const monday = getMondayUTC(startDate);
      const nextMonday = addDaysUTC(monday, 7); // fin EXCLUSIVO

      const items = await prisma.session.findMany({
        where: { date: { gte: monday, lt: nextMonday } },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: sessionSelect,
      });

      // Inicializar mapa Lun..Dom
      const days: Record<string, typeof items> = {};
      for (let i = 0; i < 7; i++) {
        const key = toYYYYMMDDUTC(addDaysUTC(monday, i));
        days[key] = [];
      }
      for (const s of items) {
        const k = toYYYYMMDDUTC(new Date(s.date));
        if (!days[k]) days[k] = [];
        days[k].push(s);
      }

      return NextResponse.json({
        days,
        weekStart: toYYYYMMDDUTC(monday),
        weekEnd: toYYYYMMDDUTC(addDaysUTC(monday, 6)), // Domingo (informativo)
      });
    }

    // ------- LISTADO GENERAL (pantalla "Sesiones") -------
    // Devolvemos SOLO las sesiones "reales": description que empieza con [DAYNAME:...]
    const sessions = await prisma.session.findMany({
      where: {
        description: {
          startsWith: "[DAYNAME:",
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: sessionSelect,
      take: 50,
    });

    return NextResponse.json({ data: sessions });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("GET /api/sessions error:", err);
    return NextResponse.json({ error: "Error al listar sesiones" }, { status: 500 });
  }
}

// POST /api/sessions  (solo CT/ADMIN)
export async function POST(req: Request) {
  try {
    const session = await requireSessionWithRoles([Role.CT, Role.ADMIN]);

    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, date, type } = parsed.data;

    const created = await prisma.session.create({
      data: {
        title,
        description: description ?? null,
        date: new Date(date),
        type: type ?? "GENERAL",
        createdBy: session.user.id,
      },
      select: sessionSelect,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("POST /api/sessions error:", err);
    return NextResponse.json({ error: "Error al crear la sesión" }, { status: 500 });
  }
}

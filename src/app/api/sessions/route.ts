// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// --- Helpers de sesión/roles ---
async function getSessionSafe() {
  try {
    return (await getServerSession()) as any;
  } catch {
    return null;
  }
}
function requireCT(session: any) {
  if (!session?.user) return false;
  const role =
    session.user.role ||
    session.user?.role?.name ||
    (session.user as any)?.roleId;
  return role === "CT" || role === "ADMIN";
}
function isAuthed(session: any) {
  return !!session?.user;
}

// --- Validaciones ---
const createSessionSchema = z.object({
  title: z.string().min(2, "Título muy corto"),
  description: z.string().optional().nullable(),
  date: z.string().datetime({ message: "Fecha inválida (usar ISO, ej: 2025-08-27T12:00:00Z)" }),
  type: z.enum(["GENERAL", "FUERZA", "TACTICA", "AEROBICO", "RECUPERACION"]).optional(),
});

// --- Respuesta para vista semanal ---
function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getMondayUTC(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7; // 1..7 (lunes=1)
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// --- Select unificado ---
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

// GET /api/sessions
// - Si viene ?start=YYYY-MM-DD -> devuelve semana { days, weekStart, weekEnd }
// - Si no, lista últimas 50 (fallback)
export async function GET(req: Request) {
  try {
    const session = await getSessionSafe();
    if (!isAuthed(session)) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const start = url.searchParams.get("start");

    if (start) {
      // Vista semanal
      const startDate = new Date(`${start}T00:00:00.000Z`);
      if (Number.isNaN(startDate.valueOf())) {
        return NextResponse.json({ error: "start inválido (YYYY-MM-DD)" }, { status: 400 });
      }
      const monday = getMondayUTC(startDate);
      const sunday = addDaysUTC(monday, 6);

      const items = await prisma.session.findMany({
        where: {
          date: { gte: monday, lte: sunday },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: sessionSelect,
      });

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
        weekEnd: toYYYYMMDDUTC(sunday),
      });
    }

    // Fallback: últimas 50
    const sessions = await prisma.session.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: sessionSelect,
      take: 50,
    });
    return NextResponse.json({ data: sessions });
  } catch (err: any) {
    console.error("GET /api/sessions error:", err);
    return NextResponse.json(
      { error: "Error al listar sesiones" },
      { status: 500 }
    );
  }
}

// POST /api/sessions -> crea sesión (solo CT/ADMIN)
export async function POST(req: Request) {
  try {
    const session = (await getServerSession()) as any;
    if (!isAuthed(session)) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!requireCT(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, date, type } = parsed.data;

    const creatorEmail: string | undefined = session.user.email;
    if (!creatorEmail) {
      return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });
    }

    const creator = await prisma.user.findUnique({
      where: { email: creatorEmail },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: "Creador no encontrado" }, { status: 404 });
    }

    const created = await prisma.session.create({
      data: {
        title,
        description: description ?? null,
        date: new Date(date),
        type: type ?? "GENERAL",
        createdBy: creator.id,
      },
      select: sessionSelect,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json(
      { error: "Error al crear la sesión" },
      { status: 500 }
    );
  }
}

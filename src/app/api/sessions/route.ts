// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth, requireSessionWithRoles } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

/* ---------- Fecha ---------- */
function toYYYYMMDDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getMondayUTC(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay() || 7; // 1..7 (Domingo=7)
  if (dow !== 1) x.setUTCDate(x.getUTCDate() - (dow - 1));
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/* ---------- DAYFLAG helpers ---------- */
const DAYFLAG_RE = /^\[DAYFLAG:(morning|afternoon)\]/i;
function isDayFlagDescription(desc?: string | null) {
  const t = (desc || "").trim();
  return !!t && DAYFLAG_RE.test(t);
}

/* ---------- Select ---------- */
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

/* ---------- Validación POST ---------- */
const createSchema = z
  .object({
    title: z.string().optional().nullable(), // "" permitido si es DAYFLAG
    description: z.string().optional().nullable(),
    date: z
      .string()
      .datetime({ message: "Fecha inválida (usar ISO, ej: 2025-08-27T12:00:00Z)" }),
    type: z
      .enum(["GENERAL", "FUERZA", "TACTICA", "AEROBICO", "RECUPERACION"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Si NO es un DAYFLAG, exigir mínimo 2 caracteres de título
    if (!isDayFlagDescription(data.description)) {
      const len = (data.title || "").trim().length;
      if (len < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Título muy corto",
          path: ["title"],
        });
      }
    }
  });

/* ---------- GET /api/sessions ---------- */
/* ?start=YYYY-MM-DD  -> devuelve mapa de la semana (Lun..Dom),
   usando lunes siguiente como FIN EXCLUSIVO (lt: nextMonday) para incluir DOMINGO a cualquier hora.
   Sin start -> listado de últimas 50 sesiones (para /ct/sessions). */
export async function GET(req: Request) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const start = url.searchParams.get("start");

    if (start) {
      // Semana para el editor
      const startDate = new Date(`${start}T00:00:00.000Z`);
      if (Number.isNaN(startDate.valueOf())) {
        return NextResponse.json(
          { error: "start inválido (YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      const monday = getMondayUTC(startDate);
      const nextMonday = addDaysUTC(monday, 7); // ✅ FIN EXCLUSIVO

      const items = await prisma.session.findMany({
        where: { date: { gte: monday, lt: nextMonday } }, // ✅ lt para incluir DOMINGO entero
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: sessionSelect,
      });

      // Construir mapa Lun..Dom
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
        weekEnd: toYYYYMMDDUTC(addDaysUTC(monday, 6)), // solo informativo
      });
    }

    // Listado para /ct/sessions (no tocar, así como te funciona)
    const sessions = await prisma.session.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: sessionSelect,
      take: 50,
    });
    return NextResponse.json({ data: sessions });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("GET /api/sessions error:", err);
    return NextResponse.json(
      { error: "Error al listar sesiones" },
      { status: 500 }
    );
  }
}

/* ---------- POST /api/sessions ---------- */
export async function POST(req: Request) {
  try {
    const session = await requireSessionWithRoles([Role.CT, Role.ADMIN]);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, date, type } = parsed.data;

    const created = await prisma.session.create({
      data: {
        title: (title ?? "").trim(), // "" permitido si es DAYFLAG
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
    // Log detallado para diagnóstico
    console.error("POST /api/sessions error:", {
      message: err?.message,
      stack: err?.stack,
      error: err,
    });
    return NextResponse.json(
      { error: "Error al crear la sesión", details: err?.message || err },
      { status: 500 }
    );
  }
}

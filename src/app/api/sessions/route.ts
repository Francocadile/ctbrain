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

// --- Select unificado ---
const sessionSelect = {
  id: true,
  title: true,
  description: true,
  date: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true, // string userId
  user: { select: { id: true, name: true, email: true, role: true } },
} as const;

// GET /api/sessions -> lista sesiones
export async function GET() {
  try {
    const session = await getSessionSafe();
    if (!isAuthed(session)) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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
        createdBy: creator.id, // string userId
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

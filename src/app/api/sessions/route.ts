// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

// === Auth helper compatible con tu setup ===
// Intenta usar el helper `auth` (NextAuth v5). Si no existe, cae a getServerSession (+ options).
async function getSessionSafe() {
  try {
    const { auth } = await import("@/auth"); // si tu proyecto expone `auth` en "@/auth"
    return auth();
  } catch {
    const { getServerSession } = await import("next-auth");
    try {
      const { authOptions } = await import("@/lib/authOptions"); // si usás options clásicas
      // @ts-expect-error - tipos flexibles por compatibilidad
      return getServerSession(authOptions);
    } catch {
      // Último intento sin options (si las inyectás en runtime)
      // @ts-expect-error
      return getServerSession();
    }
  }
}

function requireCT(session: any) {
  if (!session?.user) return false;
  // Permitimos ADMIN y CT para operar sesiones (ADMIN por mantenimiento)
  const role = session.user.role || session.user?.role?.name || session.user?.roleId;
  return role === "CT" || role === "ADMIN";
}

// === Validación de entrada ===
const createSessionSchema = z.object({
  title: z.string().min(2, "Título muy corto"),
  description: z.string().optional(),
  date: z.coerce.date(), // acepta string ISO y lo convierte a Date
  playerIds: z.array(z.string()).optional(), // IDs de User (JUGADOR)
});

// GET /api/sessions  -> lista sesiones (últimas primero)
export async function GET() {
  try {
    const session = await getSessionSafe();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    // Listado visible para CT y ADMIN por ahora
    const sessions = await prisma.session.findMany({
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
        players: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return NextResponse.json({ data: sessions });
  } catch (err: any) {
    console.error("GET /api/sessions error:", err);
    return NextResponse.json({ error: "Error al listar sesiones" }, { status: 500 });
  }
}

// POST /api/sessions -> crea sesión (solo CT/ADMIN)
export async function POST(req: Request) {
  try {
    const session = await getSessionSafe();
    if (!session?.user) {
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

    const { title, description, date, playerIds = [] } = parsed.data;

    // Busco al creador por email de la sesión actual
    const creatorEmail: string | undefined = session.user.email;
    if (!creatorEmail) {
      return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });
    }
    const creator = await prisma.user.findUnique({ where: { email: creatorEmail } });
    if (!creator) {
      return NextResponse.json({ error: "Creador no encontrado" }, { status: 404 });
    }

    // Crea la sesión y conecta jugadores (si llegan)
    const created = await prisma.session.create({
      data: {
        title,
        description,
        date,
        createdById: creator.id,
        players: playerIds.length
          ? { connect: playerIds.map((id) => ({ id })) }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
        players: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json({ error: "Error al crear la sesión" }, { status: 500 });
  }
}

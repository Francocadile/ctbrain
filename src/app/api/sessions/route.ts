// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Lee la sesión con next-auth sin imports locales
async function getSessionSafe() {
  try {
    // En tu proyecto actual, getServerSession funciona sin pasar options explícitas
    // porque NextAuth ya está configurado en las rutas de API.
    // Si en el futuro movemos a auth() v5, cambiaremos este helper.
    // @ts-expect-error tipos flexibles
    return await getServerSession();
  } catch {
    return null;
  }
}

function requireCT(session: any) {
  if (!session?.user) return false;
  const role =
    (session.user as any).role ||
    (session.user as any)?.role?.name ||
    (session.user as any)?.roleId;
  return role === "CT" || role === "ADMIN";
}

const createSessionSchema = z.object({
  title: z.string().min(2, "Título muy corto"),
  description: z.string().optional(),
  date: z.coerce.date(),
  playerIds: z.array(z.string()).optional(),
});

// GET /api/sessions -> lista sesiones
export async function GET() {
  try {
    const session = await getSessionSafe();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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
    const session = await getServerSession();
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

    const creatorEmail: string | undefined = (session.user as any).email;
    if (!creatorEmail) {
      return NextResponse.json({ error: "Usuario sin email" }, { status: 400 });
    }
    const creator = await prisma.user.findUnique({ where: { email: creatorEmail } });
    if (!creator) {
      return NextResponse.json({ error: "Creador no encontrado" }, { status: 404 });
    }

    const created = await prisma.session.create({
      data: {
        title,
        description,
        date,
        createdById: creator.id,
        players: playerIds.length ? { connect: playerIds.map((id) => ({ id })) } : undefined,
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

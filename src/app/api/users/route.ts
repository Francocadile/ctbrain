// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";

function getRole(session: any) {
  return session?.user?.role || session?.user?.role?.name || (session?.user as any)?.roleId;
}

// GET /api/users?role=JUGADOR
// Devuelve lista de usuarios (por defecto solo JUGADOR para este uso).
// Protegido: CT y ADMIN pueden listar; un JUGADOR no debería listar a todos.
export async function GET(req: Request) {
  try {
    const session = (await getServerSession()) as any;
    const role = getRole(session);
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (role !== "CT" && role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const roleQuery = url.searchParams.get("role") as
      | "ADMIN"
      | "CT"
      | "MEDICO"
      | "JUGADOR"
      | "DIRECTIVO"
      | null;

    const where = roleQuery ? { role: roleQuery } : { role: "JUGADOR" as const };

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ data: users });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

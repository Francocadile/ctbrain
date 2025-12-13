// src/app/api/players/route.ts
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";

export const dynamic = "force-dynamic";

// Listado de jugadores del equipo actual para staff (CT/ADMIN/MEDICO/DIRECTIVO/SUPERADMIN).
// Antes este endpoint era global y sin auth; ahora es multi-tenant y requiere sesión.
export async function GET(req: Request) {
  try {
    const { prisma, team, user } = await dbScope({ req });

    const role = user.role as Role | undefined;
    if (!role) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const allowed = new Set<Role>([
      Role.ADMIN,
      Role.CT,
      Role.MEDICO,
      Role.DIRECTIVO,
      Role.SUPERADMIN,
    ]);

    if (!allowed.has(role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        role: "JUGADOR",
        teams: {
          some: { teamId: team.id },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

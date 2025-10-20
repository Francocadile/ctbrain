import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/medico/users/players
 * Requiere rol MEDICO o ADMIN.
 * Devuelve SOLO usuarios con role = JUGADOR.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as any)?.role as Role | undefined;
    if (!token || (role !== Role.MEDICO && role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await prisma.user.findMany({
      where: { role: Role.JUGADOR },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    if (list.length > 0) {
      return NextResponse.json(list, {
        headers: { "cache-control": "no-store", "x-source": "enum" },
      });
    }

    const raw = await prisma.$queryRaw<
      Array<{ id: string; name: string | null; email: string | null }>
    >`SELECT id, name, email
       FROM "User"
       WHERE role IN ('JUGADOR','PLAYER')
       ORDER BY name NULLS FIRST, email NULLS FIRST`;

    return NextResponse.json(raw, {
      headers: { "cache-control": "no-store", "x-source": "raw" },
    });
  } catch (err) {
    console.error("GET /api/medico/users/players failed:", err);
    return new NextResponse(JSON.stringify([]), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-error": "1",
      },
    });
  }
}

// src/app/api/dev/set-role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/dev/set-role
 * Body JSON: { email: string, role: "JUGADOR" | "CT" | "MEDICO" | ... }
 * Header: x-admin-token: <ADMIN_TASKS_TOKEN>
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_TASKS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = body?.email as string | undefined;
  const roleStr = body?.role as keyof typeof Role | undefined;

  if (!email || !roleStr || !Role[roleStr]) {
    return NextResponse.json(
      { error: "email/role inválidos" },
      { status: 400 }
    );
  }

  const upd = await prisma.user.updateMany({
    where: { email },
    data: { role: Role[roleStr] },
  });

  return NextResponse.json({ updated: upd.count, email, role: roleStr });
}

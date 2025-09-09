// src/app/api/dev/peek-users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dev/peek-users
 * Lista rápida (máx 100) de usuarios con su rol para diagnosticar.
 * Útil para verificar si realmente hay JUGADOR en la base que está usando Vercel.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      take: 100,
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });
    return NextResponse.json(users, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    console.error("peek-users error", e);
    return NextResponse.json({ error: "peek failed" }, { status: 500 });
  }
}

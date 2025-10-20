// src/app/api/dev/peek-users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dev/peek-users
 * Muestra hasta 100 usuarios con su rol (para ver qué hay en la base).
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

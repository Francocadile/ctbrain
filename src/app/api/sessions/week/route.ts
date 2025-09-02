// src/app/api/sessions/week/route.ts
import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma"; // si tenés prisma centralizado

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start") || null; // YYYY-MM-DD
    const end = searchParams.get("end") || null;     // YYYY-MM-DD

    // Devolvemos una estructura mínima válida
    return NextResponse.json({
      start,
      end,
      items: [], // reemplazá por tu query real si corresponde
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

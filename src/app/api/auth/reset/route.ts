// src/app/api/auth/reset/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyResetToken } from "@/lib/signedToken";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "");
    const newPassword = String(body?.newPassword || "").trim();

    if (!token || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    let payload: { email: string };
    try {
      payload = verifyResetToken(token);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Token inválido" },
        { status: 400 }
      );
    }

    const email = payload.email.toLowerCase();
    const hashed = await bcrypt.hash(newPassword, 10);

    // Actualizamos si existe; por privacidad, no filtramos si no existe
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    }).catch(() => { /* noop si no existe */ });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[auth:reset:error]", e?.message || e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

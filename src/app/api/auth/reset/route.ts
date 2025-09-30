// src/app/api/auth/reset/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/signedToken";
import bcrypt from "bcryptjs";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json().catch(() => ({}));
    const pass = String(password || "").trim();
    if (!token || !pass) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (pass.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET!;
    const payload = verifyToken<{ email: string }>(String(token), secret);
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // No revelamos existencia
      return NextResponse.json({ ok: true });
    }

    const hash = await bcrypt.hash(pass, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
  }
}

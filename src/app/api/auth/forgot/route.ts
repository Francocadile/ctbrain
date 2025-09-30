// src/app/api/auth/forgot/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { signToken } from "@/lib/signedToken";
import { sendResetEmail } from "@/lib/email";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    // Buscar usuario (pero no revelar si existe o no)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Siempre respondemos 200 por privacidad
    const origin =
      req.headers.get("origin") ||
      `${process.env.APP_BASE_URL || "http://localhost:3000"}`;

    if (user) {
      const secret = process.env.NEXTAUTH_SECRET!;
      const token = signToken({ email: user.email }, secret, 60 * 60); // 1h
      const link = `${origin}/reset-password/${encodeURIComponent(token)}`;
      await sendResetEmail(user.email, user.name, link);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// src/app/api/auth/forgot/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { signResetToken } from "@/lib/signedToken";
import { rateLimit } from "@/lib/rateLimit";

const prisma = new PrismaClient();

function getOrigin(req: Request) {
  const h = new Headers(req.headers);
  return h.get("origin") || new URL(req.url).origin;
}

function getClientIP(req: Request): string {
  const h = new Headers(req.headers);
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  const ip = getClientIP(req);

  try {
    const { email: rawEmail } = await req.json().catch(() => ({ email: "" }));
    const email = String(rawEmail || "").trim().toLowerCase();

    // Rate limit básico (5 req / 10 min por IP+email)
    const rl = await rateLimit({
      identifier: `forgot:${ip}:${email || "no-email"}`,
      limit: 5,
      windowSec: 600,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: true }, // respuesta genérica para no filtrar información
        { status: 200 }
      );
    }

    // Siempre respondemos 200 para no permitir enumeración de emails
    if (!email) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Si no existe, devolvemos ok igual (no exponemos)
    if (!user) return NextResponse.json({ ok: true });

    const token = signResetToken({ email }, { expiresInSec: 3600 });
    const origin = getOrigin(req);
    const url = `${origin}/reset-password/${token}`;

    // En esta fase 1: imprimimos el link en logs (en prod futuro se envía por email)
    console.info("[auth:forgot] reset link:", { email, url });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[auth:forgot:error]", e?.message || e);
    // Por privacidad, igual respondemos 200
    return NextResponse.json({ ok: true });
  }
}

// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";

const prisma = new PrismaClient();

function getClientIP(req: Request): string {
  const h = new Headers(req.headers);
  const fwd = h.get("x-forwarded-for") || "";
  const ip =
    fwd.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown";
  return ip;
}

// POST /api/users  -> alta pública
// Siempre crea JUGADOR pendiente, ignora cualquier "role" entrante
export async function POST(req: Request) {
  const ip = getClientIP(req);

  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const password = (body?.password || "").trim();

    // ===== Rate Limit (5 req / 10 min por IP+email) =====
    const identifier = `signup:${ip}:${email || "no-email"}`;
    const rl = await rateLimit({ identifier, limit: 5, windowSec: 600 });

    console.info("[signup:rate-limit]", {
      ip,
      email,
      allowed: rl.allowed,
      remaining: rl.remaining,
      resetInSec: Math.ceil((rl.reset - Date.now()) / 1000),
      strategy: rl.strategy,
    });

    if (!rl.allowed) {
      const secondsLeft = Math.max(0, Math.ceil((rl.reset - Date.now()) / 1000));
      const minutesLeft = Math.ceil(secondsLeft / 60);
      return NextResponse.json(
        {
          error:
            minutesLeft > 1
              ? `Demasiados intentos. Probá de nuevo en ~${minutesLeft} minutos.`
              : "Demasiados intentos. Probá de nuevo en un momento.",
        },
        { status: 429 }
      );
    }

    // ===== Validación básica =====
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash de la contraseña desde el alta
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: "JUGADOR",     // forzado
        isApproved: false,   // pendiente
        mustChangePassword: false,
      },
      select: { id: true, email: true, role: true, isApproved: true },
    });

    console.info("[signup:created]", {
      ip,
      email,
      role: user.role,
      approved: user.isApproved,
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    console.error("[signup:error]", { ip, error: e?.message || String(e) });
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

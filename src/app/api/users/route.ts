// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
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

// POST /api/users  -> alta simple (usado en /login)
// Por defecto: JUGADOR con isApproved = false (pendiente)
export async function POST(req: Request) {
  const ip = getClientIP(req);

  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const password = (body?.password || "").trim();
    const role: Role = (body?.role as Role) || "JUGADOR";

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

    // ===== Validación básica de payload =====
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

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // (flujo original, sin hash — se migrará en el primer login)
        role,
        isApproved: false, // queda pendiente hasta aprobación
      },
    });

    console.info("[signup:created]", {
      ip,
      email,
      role: user.role,
      approved: user.isApproved,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (e: any) {
    console.error("[signup:error]", { ip, error: e?.message || String(e) });
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

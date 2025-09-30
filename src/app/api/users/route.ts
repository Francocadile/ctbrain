// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  rateLimitUpstash,
  THROTTLE_COOKIE,
  THROTTLE_WINDOW_MS,
  readCookie,
} from "@/lib/rateLimit";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export async function POST(req: Request) {
  // Pequeño delay para aplanar bursts manuales
  await new Promise((r) => setTimeout(r, 350));

  const ua = req.headers.get("user-agent") || "";
  const fwd =
    (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "";
  const ipMasked = fwd ? fwd.replace(/\.\d+$/, ".xxx") : "n/a";

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();
    const role: Role = "JUGADOR"; // forzado por seguridad

    // Rate-limit Upstash (si está disponible)
    const key = email || fwd || "unknown";
    const rl = await rateLimitUpstash(key, { windowSec: 600, max: 5 });
    if (!rl.allowed) {
      const res429 = NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
      if (typeof rl.retryAfter === "number") {
        res429.headers.set("Retry-After", String(rl.retryAfter));
      }
      return res429;
    }

    // Fallback cookie throttle si no hay Upstash
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      const now = Date.now();
      const last = Number(readCookie(req.headers.get("cookie"), THROTTLE_COOKIE) || 0);
      if (Number.isFinite(last) && now - last < THROTTLE_WINDOW_MS) {
        console.info("[signup] throttled", { ipMasked, ua });
        return NextResponse.json(
          { error: "Too many requests. Try again shortly." },
          { status: 429 }
        );
      }
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role,
        isApproved: false, // pendiente hasta aprobación
      },
      select: { id: true, email: true, role: true, isApproved: true },
    });

    console.info("[signup] ok", { email, ipMasked, ua });

    const res = NextResponse.json({ ok: true, user });

    // Fallback cookie throttle set
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      const now = Date.now();
      res.headers.set(
        "Set-Cookie",
        `${THROTTLE_COOKIE}=${encodeURIComponent(String(now))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.ceil(
          THROTTLE_WINDOW_MS / 1000
        )}`
      );
    }
    return res;
  } catch (e: any) {
    console.error("[signup] error", e?.message || e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

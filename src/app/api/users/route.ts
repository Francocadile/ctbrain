// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

const THROTTLE_COOKIE = "signup_t";
const THROTTLE_WINDOW_MS = 30_000; // 30s

function readCookie(cookiesHeader: string | null, name: string) {
  if (!cookiesHeader) return null;
  const parts = cookiesHeader.split(/; */);
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === name) return decodeURIComponent(v ?? "");
  }
  return null;
}

export async function POST(req: Request) {
  // Pequeño delay para aplanar bursts manuales
  await new Promise((r) => setTimeout(r, 450));

  const ua = req.headers.get("user-agent") || "";
  const fwd = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "";
  const ipMasked = fwd ? fwd.replace(/\.\d+$/, ".xxx") : "n/a";

  // Throttle básico por cookie
  const now = Date.now();
  const last = Number(readCookie(req.headers.get("cookie"), THROTTLE_COOKIE) || 0);
  if (Number.isFinite(last) && now - last < THROTTLE_WINDOW_MS) {
    console.info("[signup] throttled", { ipMasked, ua });
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();
    // Ignoramos role entrante por seguridad: siempre JUGADOR
    const role: Role = "JUGADOR";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role,
        isApproved: false, // pendiente hasta aprobación por Admin
      },
      select: { id: true, email: true, role: true, isApproved: true },
    });

    console.info("[signup] ok", { email, ipMasked, ua });

    const res = NextResponse.json({ ok: true, user });
    res.headers.set(
      "Set-Cookie",
      `${THROTTLE_COOKIE}=${encodeURIComponent(String(now))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.ceil(
        THROTTLE_WINDOW_MS / 1000
      )}`
    );
    return res;
  } catch (e: any) {
    console.error("[signup] error", e?.message || e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const prisma = new PrismaClient();

/** Hash con scrypt (Node crypto) — formato: salt:hash (hex) */
function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** (Se usará luego en el login) */
export function verifyPassword(plain: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    const candidate = scryptSync(plain, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
}

/** Sanitiza y valida email básico */
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const emailRaw = String(body?.email ?? "");
    const password = String(body?.password ?? "");
    const roleRaw = String(body?.role ?? "JUGADOR").trim().toUpperCase();

    const email = normalizeEmail(emailRaw);

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: name, email, password" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Solo permitir alta pública como JUGADOR (otros roles los crea Admin)
    const role =
      roleRaw === "JUGADOR"
        ? Role.JUGADOR
        : Role.JUGADOR; // forzamos jugador; otros roles quedan a cargo de Admin

    // Unicidad
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    // Hash + alta
    const passwordHashed = hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(
      {
        ok: true,
        user,
        message:
          "Cuenta creada correctamente. Podés iniciar sesión. (Roles especiales se asignan desde Admin).",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/users] error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}

/** (Opcional) Método no permitido para otras acciones si no las implementás aún */
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

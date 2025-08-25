import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hash } from "bcryptjs";

async function requireAdmin(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ users });
}

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  role: z.enum(["ADMIN", "CT", "MEDICO", "JUGADOR", "DIRECTIVO"]),
  password: z.string().min(6).max(100),
});

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name, role, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email ya existe" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, role, passwordHash },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}

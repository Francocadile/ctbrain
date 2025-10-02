// src/app/api/ops/ensure-default-admin/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function looksLikeBcrypt(hash?: string | null) {
  if (!hash) return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

async function ensure(req: Request) {
  const url = new URL(req.url);
  const tokenParam = url.searchParams.get("token") || (await req.json().catch(() => ({}))).token;

  const ADMIN_SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || "";
  const EMAIL = process.env.DEFAULT_ADMIN_EMAIL || "admin@ctbrain.local";
  const PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "123456";
  const NAME = process.env.DEFAULT_ADMIN_NAME || "Administrador";

  if (!ADMIN_SETUP_TOKEN) {
    return NextResponse.json({ ok: false, error: "ADMIN_SETUP_TOKEN no configurado" }, { status: 500 });
  }
  if (!tokenParam || tokenParam !== ADMIN_SETUP_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // buscar si existe
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, isApproved: true, password: true },
  });

  const hashed = looksLikeBcrypt(existing?.password) ? existing!.password! : await bcrypt.hash(PASSWORD, 10);

  let user;
  if (!existing) {
    user = await prisma.user.create({
      data: {
        email: EMAIL.toLowerCase(),
        name: NAME,
        role: "ADMIN",
        isApproved: true,
        password: hashed,
      },
      select: { id: true, email: true, name: true, role: true, isApproved: true },
    });
  } else {
    user = await prisma.user.update({
      where: { email: EMAIL.toLowerCase() },
      data: {
        name: existing.name ?? NAME,
        role: "ADMIN",
        isApproved: true,
        password: hashed,
      },
      select: { id: true, email: true, name: true, role: true, isApproved: true },
    });
  }

  return NextResponse.json({ ok: true, admin: user });
}

export async function GET(req: Request) { return ensure(req); }
export async function POST(req: Request) { return ensure(req); }

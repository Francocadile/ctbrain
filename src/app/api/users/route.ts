// src/app/api/users/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return false;
}

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json();
  if (ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const obj: any = {};
    form.forEach((v, k) => (obj[k] = String(v)));
    return obj;
  }
  return {};
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const name = (body?.name || "").trim();
    const email = (body?.email || "").trim().toLowerCase();
    const password = (body?.password || "").trim();
    const requestedRole: Role | undefined = body?.role && Role[body.role as keyof typeof Role] ? (body.role as Role) : undefined;
    const token = (body?.token || "").trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Defaults
    let finalRole: Role = requestedRole ?? Role.JUGADOR;
    let finalApproved = false;
    let teamIdForMembership: string | null = null;

    // Si viene invitación, validarla
    if (token) {
      const inv = await prisma.invite.findUnique({ where: { token } });
      const now = new Date();

      if (!inv || inv.revoked || (inv.expiresAt && inv.expiresAt < now) || inv.uses >= inv.maxUses) {
        return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 400 });
      }

      if (inv.role) finalRole = inv.role;
      if (inv.teamId) teamIdForMembership = inv.teamId;
      if (toBool(inv.autoApprove)) finalApproved = true;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: finalRole,
        isApproved: finalApproved,
      },
    });

    // Si la invitación apuntaba a un equipo, crear UserTeam
    if (teamIdForMembership) {
      await prisma.userTeam.create({
        data: { userId: user.id, teamId: teamIdForMembership, role: finalRole },
      });
    }

    // Si se usó token, incrementar usos y auditar
    if (token) {
      await prisma.invite.update({
        where: { token },
        data: { uses: { increment: 1 } },
      });
      await logAudit({
        actorId: null,
        action: "INVITE_REDEEMED",
        entityType: "Invite",
        entityId: token,
        meta: { email: user.email, userId: user.id, role: user.role, teamId: teamIdForMembership },
      });
    }

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
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, Role, TeamRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== "SUPERADMIN") {
    return null;
  }
  return session;
}

export async function GET(_req: Request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: { teams: true },
    });
    // Map teamId for each user (first team or null)
    const mapped = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      teamId: u.teams[0]?.teamId || null,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("GET /api/superadmin/users error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json().catch(() => null);
    const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data?.password === "string" ? data.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    const role = data?.role as Role | undefined;
    const teamId = data?.teamId as string | undefined;

    const user = await prisma.user.create({
      data: {
        name: typeof data?.name === "string" ? data.name : null,
        email,
        role: role ?? Role.JUGADOR,
        passwordHash,
        isApproved: true,
        teams:
          teamId && role && role !== "SUPERADMIN"
            ? {
                create: [
                  {
                    team: { connect: { id: teamId } },
                    role: role as TeamRole,
                  },
                ],
              }
            : undefined,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("POST /api/superadmin/users error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json().catch(() => null);
    const id = typeof data?.id === "string" ? data.id : "";
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const role = data?.role as Role | undefined;
    const teamId = data?.teamId as string | undefined;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: typeof data?.name === "string" ? data.name : undefined,
        email: typeof data?.email === "string" ? data.email : undefined,
        role: role ?? undefined,
        teams:
          teamId && role
            ? {
                upsert: {
                  where: { userId_teamId: { userId: id, teamId } },
                  update: { role: role as TeamRole },
                  create: { teamId, role: role as TeamRole },
                },
              }
            : undefined,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("PUT /api/superadmin/users error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/superadmin/users error", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

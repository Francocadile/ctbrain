// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false });
  return NextResponse.json({
    ok: true,
    user: {
      email: session.user?.email || null,
      role: (session.user as any)?.role || null,
      id: (session.user as any)?.id || null,
      name: session.user?.name || null,
    },
  });
}

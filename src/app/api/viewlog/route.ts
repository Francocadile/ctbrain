import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSessionWithRoles } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await requireSessionWithRoles(['JUGADOR', 'CT', 'ADMIN']);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: err.status || 401 });
    }
    const body = await req.json();
    const { entityType, entityId } = body;
    if (!['SESSION', 'EXERCISE'].includes(entityType) || !entityId) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    const log = await prisma.viewLog.create({
      data: {
        userId: session.user.id,
        entityType,
        entityId,
      },
    });
    return NextResponse.json({ ok: true, timestamp: log.createdAt });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno', details: String(err) }, { status: 500 });
  }
}

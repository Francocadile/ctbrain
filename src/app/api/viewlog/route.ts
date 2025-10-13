import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const body = await req.json();
    const { entityType, entityId, extra } = body;
    const log = await prisma.viewLog.create({
      data: {
        userId: session.user.id,
        entityType,
        entityId,
        extra,
      },
    });
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: 'Error al registrar visto' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');
    const where: any = {};
    if (entityId) where.entityId = entityId;
    const logs = await prisma.viewLog.findMany({
      where,
      orderBy: { viewedAt: 'desc' },
    });
    // Métricas: conteo por entityId
    const conteo = logs.reduce((acc: Record<string, number>, log: { entityId: string }) => {
      acc[log.entityId] = (acc[log.entityId] || 0) + 1;
      return acc;
    }, {});
    return NextResponse.json({ logs, conteo });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener métricas' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    const audience = searchParams.get('audience');
    const where: any = {};
    if (weekStart) where.weekStart = new Date(weekStart);
    if (audience) where.audience = audience;
    const assets = await prisma.sharedAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(assets);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener assets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !['CT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    const body = await req.json();
    const { title, type, url, note, weekStart, audience } = body;
    const asset = await prisma.sharedAsset.create({
      data: {
        title,
        type,
        url,
        note,
        weekStart: new Date(weekStart),
        audience,
        createdById: session.user.id,
      },
    });
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear asset' }, { status: 500 });
  }
}

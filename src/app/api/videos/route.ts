import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const tags = searchParams.get('tags')?.split(',');
    const where: any = {};
    if (topic) where.topic = topic;
    if (tags && tags.length > 0) where.tags = { hasSome: tags };
    const videos = await prisma.coachVideo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener videos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !['CT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    const body = await req.json();
    const { title, topic, url, tags } = body;
    const video = await prisma.coachVideo.create({
      data: {
        title,
        topic,
        url,
        tags,
        createdById: session.user.id,
      },
    });
    return NextResponse.json(video);
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear video' }, { status: 500 });
  }
}

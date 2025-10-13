import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const rutinas = await prisma.playerRoutine.findMany({
      where: { userId: session.user.id },
      orderBy: { day: 'desc' },
    });
    return NextResponse.json(rutinas);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener rutinas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const body = await req.json();
    const { day, ejercicios, feedback, userId } = body;
    // Solo CT/ADMIN pueden asignar rutinas a otros
    const asignaOtro = userId && userId !== session.user.id;
    if (asignaOtro && !['CT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    const rutina = await prisma.playerRoutine.create({
      data: {
        userId: userId || session.user.id,
        day,
        ejercicios,
        feedback,
      },
    });
    return NextResponse.json(rutina);
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear rutina' }, { status: 500 });
  }
}

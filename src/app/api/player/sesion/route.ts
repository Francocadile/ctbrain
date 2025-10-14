import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSessionWithRoles } from '@/lib/auth-helpers';

export async function GET() {
  try {
    let session;
    try {
      session = await requireSessionWithRoles(['JUGADOR', 'CT', 'ADMIN']);
    } catch (err: any) {
      return NextResponse.json({ code: 'NO_SESSION', error: err.message }, { status: 401 });
    }
    // Rango de fecha local (sin libs externas)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start); end.setDate(end.getDate() + 1);
    // Buscar sesión visible de hoy
    const sesion = await prisma.session.findFirst({
      where: {
        date: { gte: start, lt: end },
        isVisibleToPlayers: true,
      },
      orderBy: { date: 'asc' },
    });
    if (!sesion) {
      return NextResponse.json({ code: 'NO_VISIBLE_SESSION' }, { status: 404 });
    }
    // Ejercicios visibles de la sesión, ordenados por createdAt asc
    const exercises = await prisma.exercise.findMany({
      where: {
        userId: session.user.id,
        isVisibleToPlayers: true,
        // Si hay campo de sessionId, agregar aquí
        // sessionId: sesion.id,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, description: true, createdAt: true },
    });
    return NextResponse.json({ sesion: { ...sesion, exercises } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ code: 'UNEXPECTED', message: String(err) }, { status: 500 });
  }
}

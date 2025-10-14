import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSessionWithRoles } from '@/lib/auth-helpers';

const TIMEZONE = 'America/Argentina/Mendoza';

export async function GET() {
  try {
    let session;
    try {
      session = await requireSessionWithRoles(['JUGADOR', 'CT', 'ADMIN']);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: err.status || 401 });
    }
    // Determinar fecha local "hoy" en zona horaria Mendoza
    const now = new Date();
    // Convertir a hora local de Mendoza
    const localeNow = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    const today = new Date(localeNow.getFullYear(), localeNow.getMonth(), localeNow.getDate());
    // Buscar sesión visible de hoy
    const sesion = await prisma.session.findFirst({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        isVisibleToPlayers: true,
      },
      include: {
        exercises: {
          where: { isVisibleToPlayers: true },
          select: { id: true, title: true, description: true },
        },
      },
      orderBy: { date: 'asc' },
    });
    if (!sesion || !sesion.exercises.length) {
      return NextResponse.json({ error: 'Sin ejercicios visibles' }, { status: 404 });
    }
    return NextResponse.json({ ejercicios: sesion.exercises });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno', details: String(err) }, { status: 500 });
  }
}

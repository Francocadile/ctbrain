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
      orderBy: { date: 'asc' },
    });
    if (!sesion) {
      return NextResponse.json({ error: 'Sin ejercicios visibles' }, { status: 404 });
    }
    // Buscar ejercicios visibles del usuario en la sesión del día
    const ejercicios = await prisma.exercise.findMany({
      where: {
        userId: session.user.id,
        isVisibleToPlayers: true,
        // Si hay campo de fecha o sessionId, agregar aquí
        // Ejemplo: sessionId: sesion.id
      },
      select: { id: true, title: true, description: true },
    });
    if (!ejercicios.length) {
      return NextResponse.json({ error: 'Sin ejercicios visibles' }, { status: 404 });
    }
    return NextResponse.json({ ejercicios });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno', details: String(err) }, { status: 500 });
  }
}

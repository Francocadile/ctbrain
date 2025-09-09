// src/app/api/injuries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isUUIDLike(s: string) {
  return /^[0-9a-f-]{22,36}$/i.test(s); // flexible
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Puede venir como userId o como 'player'/'jugador' por si hay forms viejos
    let userId: string | undefined =
      body.userId || body.player || body.jugador || "";

    // Si no mandaron nada, error claro
    if (!userId) {
      return NextResponse.json(
        { error: "Falta el jugador: enviá userId o nombre/email" },
        { status: 400 }
      );
    }

    // Intentamos resolver el usuario:
    // - Si parece UUID/ID -> buscamos por id
    // - Si no -> buscamos por nombre o email exacto
    let user = null as null | { id: string };
    if (isUUIDLike(userId)) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
    } else {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ name: userId }, { email: userId }],
        },
        select: { id: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "userId inválido: usá el id del jugador, o el nombre/email exactamente como figura en Usuarios.",
        },
        { status: 400 }
      );
    }

    // Armamos los datos de la entrada
    const data = {
      userId: user.id,
      date: body.date ? new Date(body.date) : new Date(),
      status: body.status, // "Activo" | "Reintegro" | "Alta"
      bodyPart: body.bodyPart ?? null,
      laterality: body.laterality ?? null,
      mechanism: body.mechanism ?? null,
      severity: body.severity ?? null,
      expectedReturn: body.expectedReturn ? new Date(body.expectedReturn) : null,
      availability: body.availability ?? "Limitada", // "Out" | "Limitada" | "Full"
      pain: body.pain ?? null,
      capMinutes: body.capMinutes ?? null,
      noSprint: !!body.noSprint,
      noChangeOfDirection: !!body.noChangeOfDirection,
      gymOnly: !!body.gymOnly,
      noContact: !!body.noContact,
      note: body.note ?? null,
    };

    const created = await prisma.injuryEntry.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error creando entrada" },
      { status: 500 }
    );
  }
}

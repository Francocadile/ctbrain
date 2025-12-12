import { NextResponse } from "next/server";

export async function GET() {
  // Healthcheck ultra simple por ahora: solo indica que la app responde.
  // Más adelante podemos sumar un ping a la DB si hace falta.
  return NextResponse.json(
    {
      ok: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

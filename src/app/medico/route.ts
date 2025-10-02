// src/app/medico/route.ts  (compatibilidad: redirige a /med)
import { NextResponse } from "next/server";

export function GET(req: Request) {
  const url = new URL(req.url);
  const target = new URL("/med", url.origin);
  return NextResponse.redirect(target, 308);
}

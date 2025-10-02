// src/app/medico/route.ts  ← compat: redirige cualquier acceso a /medico → /med
import { NextResponse } from "next/server";

export function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/med";
  return NextResponse.redirect(url);
}

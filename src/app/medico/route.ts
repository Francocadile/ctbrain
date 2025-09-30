// src/app/medico/route.ts
import { NextResponse } from "next/server";

/**
 * Compatibilidad con rutas antiguas: /medico → /med
 * Preserva querystring. Redirección permanente para SEO y caches.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.search ? url.search : "";
  return NextResponse.redirect(`${url.origin}/med${qs}`, 308);
}

export const runtime = "nodejs";

// src/app/api/dev/debug-exercises-scan/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

function extractB64(desc?: string | null) {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return "";
  const rest = text.slice(idx + EX_TAG.length).trim();
  return (rest.split(/\s+/)[0] || "").trim();
}

export async function GET() {
  // 1) Buscar sesiones que contengan el tag
  const sessions = await prisma.session.findMany({
    where: { description: { contains: EX_TAG } },
    select: { id: true, date: true, description: true, createdBy: true, title: true },
    orderBy: { date: "desc" },
    take: 50, // para no listar infinito
  });

  // 2) Intentar decodificar para ver si el payload está bien
  const details = sessions.map((s) => {
    const b64 = extractB64(s.description);
    let parsed: any[] = [];
    let ok = false;
    let error: string | null = null;

    if (b64) {
      try {
        const json = Buffer.from(b64, "base64").toString("utf8");
        const arr = JSON.parse(json);
        if (Array.isArray(arr)) {
          parsed = arr;
          ok = true;
        } else {
          error = "JSON no es array";
        }
      } catch (e: any) {
        error = e?.message || "decode error";
      }
    } else {
      error = "No se encontró base64 tras [EXERCISES]";
    }

    return {
      id: s.id,
      date: s.date,
      title: s.title,
      owner: s.createdBy,
      b64Length: b64.length,
      ok,
      error,
      itemsPreview: parsed.slice(0, 2), // muestra dos para no explotar el JSON
      itemsCount: parsed.length,
    };
  });

  return NextResponse.json({
    foundSessions: sessions.length,
    withValidPayload: details.filter((d) => d.ok).length,
    details,
  });
}

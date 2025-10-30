// src/app/api/ct/exercises/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();
const EX_TAG = "[EXERCISES]";

// ====== Filas de contenido del editor (mismo set que usamos en la UI) ======
const CONTENT_ROWS = new Set(["PRE ENTREN0", "FÍSICO", "TÉCNICO–TÁCTICO", "COMPENSATORIO"]);

// ====== Marcador de celdas del editor semanal ======
const GRID_RE = /^\[GRID:(morning|afternoon):(.+?)\]/i;

// -------- helpers (node-safe base64 json) --------
function decodeB64Json<T = any>(b64: string): T | null {
  try {
    const s = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  return new Response("Not implemented", { status: 501 });
}

// src/app/api/ct/exercises/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ===== Encoder/Decoder (igual al editor) =====================================
const EX_TAG = "[EXERCISES]";

function decodeExercises(desc: string | null | undefined): { prefix: string; exercises: any[] } {
  const text = (desc || "").trimEnd();
  const idx = text.lastIndexOf(EX_TAG);
  if (idx === -1) return { prefix: text, exercises: [] };
  const prefix = text.slice(0, idx).trimEnd();
  const rest = text.slice(idx + EX_TAG.length).trim();
  const b64 = rest.split(/\s+/)[0] || "";
  try {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    const arr = JSON.parse(json) as Partial<any>[];
    if (Array.isArray(arr)) {
      const fixed = arr.map((e) => ({
        title: e.title ?? "",
        kind: e.kind ?? "",
        space: e.space ?? "",
        players: e.players ?? "",
        duration: e.duration ?? "",
        description: e.description ?? "",
        imageUrl: e.imageUrl ?? "",
      }));
      return { prefix, exercises: fixed };
    }
  } catch {}
  return { prefix: text, exercises: [] };
}

function encodeExercises(prefix: string, exercises: any[]) {
  const b64 = Buffer.from(JSON.stringify(exercises), "utf-8").toString("base64");
  const safePrefix = (prefix || "").trimEnd();
  return `${safePrefix}\n\n${EX_TAG} ${b64}`;
}

// id = sessionId::index
function splitId(id: string): { sessionId: string; index: number } | null {
  const [sessionId, idxStr] = id.split("::");
  const index = Number(idxStr);
  if (!sessionId || !Number.isInteger(index) || index < 0) return null;
  return { sessionId, index };
}

// ===== GET: detalle de un ejercicio (por id compuesto) =======================
export async function GET(req: Request) {
  return new Response("Not implemented", { status: 501 });
}

// ===== DELETE: eliminar un ejercicio de la sesión ============================
export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  try {
    const comb = splitId(ctx.params.id);
    if (!comb) return new NextResponse("Formato de id inválido", { status: 400 });

    const s = await prisma.session.findUnique({ where: { id: comb.sessionId } });
    if (!s) return new NextResponse("Sesión no encontrada", { status: 404 });

    const { prefix, exercises } = decodeExercises(s.description || "");
    if (comb.index < 0 || comb.index >= exercises.length) {
      return new NextResponse("Índice de ejercicio inválido", { status: 400 });
    }
    const next = exercises.filter((_, i) => i !== comb.index);

    await prisma.session.update({
      where: { id: s.id },
      data: { description: encodeExercises(prefix, next) },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

// ===== PUT: actualizar un ejercicio puntual (opcional) =======================
// Body: { title?, kind?, space?, players?, duration?, description?, imageUrl? }
export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const comb = splitId(ctx.params.id);
    if (!comb) return new NextResponse("Formato de id inválido", { status: 400 });

    const patch = await req.json();
    const s = await prisma.session.findUnique({ where: { id: comb.sessionId } });
    if (!s) return new NextResponse("Sesión no encontrada", { status: 404 });

    const { prefix, exercises } = decodeExercises(s.description || "");
    if (comb.index < 0 || comb.index >= exercises.length) {
      return new NextResponse("Índice de ejercicio inválido", { status: 400 });
    }

    const curr = exercises[comb.index];
    const updated: any = {
      title: (patch.title ?? curr.title) || "",
      kind: (patch.kind ?? curr.kind) || "",
      space: (patch.space ?? curr.space) || "",
      players: (patch.players ?? curr.players) || "",
      duration: (patch.duration ?? curr.duration) || "",
      description: (patch.description ?? curr.description) || "",
      imageUrl: (patch.imageUrl ?? curr.imageUrl) || "",
    };

    const next = [...exercises];
    next[comb.index] = updated;

    await prisma.session.update({
      where: { id: s.id },
      data: { description: encodeExercises(prefix, next) },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Error", { status: 500 });
  }
}

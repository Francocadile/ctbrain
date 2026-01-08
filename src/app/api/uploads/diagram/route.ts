import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  exerciseIndex: z.number().int().nonnegative(),
  pngDataUrl: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    assertCsrf(req);

    const { team, user } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { sessionId, exerciseIndex, pngDataUrl } = parsed.data;

    console.log("[uploads/diagram] incoming", {
      role: user.role,
      teamId: team.id,
      sessionId,
      exerciseIndex,
    });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN missing");
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN missing" },
        { status: 500 },
      );
    }

    const base64PrefixIndex = pngDataUrl.indexOf("base64,");
    const base64Part =
      base64PrefixIndex >= 0
        ? pngDataUrl.slice(base64PrefixIndex + "base64,".length)
        : pngDataUrl;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Part, "base64");
    } catch (err) {
      console.error("No se pudo decodificar pngDataUrl", err);
      return NextResponse.json(
        { error: "PNG inválido" },
        { status: 400 },
      );
    }

    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `openbase/${team.id}/sessions/${safeSessionId}/exercise-${exerciseIndex}.png`;

    const blob = await put(path, buffer, {
      access: "public",
      contentType: "image/png",
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("Error al subir diagrama a Blob", error);
    return NextResponse.json({ error: "Error al subir diagrama" }, { status: 500 });
  }
}

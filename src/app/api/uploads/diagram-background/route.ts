import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  pngDataUrl: z.string().min(1), // puede ser png/jpg, usamos dataURL genérico
});

export async function POST(req: Request) {
  try {
    assertCsrf(req);

    const { team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { sessionId, pngDataUrl } = parsed.data;

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
        { error: "Imagen inválida" },
        { status: 400 },
      );
    }

    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      // Entorno de desarrollo sin Blob: guardamos un PNG en disco local bajo /public/dev-uploads
      if (process.env.NODE_ENV !== "production") {
        try {
          const fs = await import("fs/promises");
          const pathMod = await import("path");

          const rootDir = process.cwd();
          const uploadsDir = pathMod.join(rootDir, "public", "dev-uploads", "sessions", safeSessionId);
          await fs.mkdir(uploadsDir, { recursive: true });

          const filename = `diagram-background-${randomUUID()}.png`;
          const filePath = pathMod.join(uploadsDir, filename);
          await fs.writeFile(filePath, buffer);

          const publicUrl = `/dev-uploads/sessions/${safeSessionId}/${filename}`;
          console.warn("Blob no configurado; usando fallback local DEV para diagram-background", {
            filePath,
            publicUrl,
          });

          return NextResponse.json({ url: publicUrl });
        } catch (err) {
          console.error("Fallback local DEV para diagram-background falló", err);
          return NextResponse.json(
            {
              error:
                "Blob storage no configurado y no se pudo escribir en el filesystem local en desarrollo.",
            },
            { status: 500 },
          );
        }
      }

      console.error("BLOB_READ_WRITE_TOKEN no configurado en producción");
      return NextResponse.json(
        {
          error:
            "Blob storage no configurado: falta la env BLOB_READ_WRITE_TOKEN en el entorno de despliegue.",
        },
        { status: 500 },
      );
    }

    const path = `openbase/${team.id}/sessions/${safeSessionId}/diagram-background.png`;

    const blob = await put(path, buffer, {
      access: "public",
      // PNG por defecto, navegadores suelen servir igual JPG con este header sin problema
      contentType: "image/png",
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("Error al subir fondo de diagrama a Blob", error);
    return NextResponse.json({ error: "Error al subir fondo" }, { status: 500 });
  }
}

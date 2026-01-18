import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

function safeFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}

function isPdfFile(file: File) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return type === "application/pdf" || name.endsWith(".pdf");
}

// GET /api/ct/next-rival
export async function GET(req: Request) {
  try {
    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const row = await prisma.nextRivalFile.findUnique({
      where: { teamId: team.id },
      select: { fileName: true, uploadedAt: true },
    });

    if (!row) return NextResponse.json({ exists: false });
    return NextResponse.json({
      exists: true,
      fileName: row.fileName,
      uploadedAt: row.uploadedAt.toISOString(),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("ct next-rival GET error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ct/next-rival (multipart/form-data)
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo" }, { status: 400 });
    }

    if (!isPdfFile(file)) {
      return NextResponse.json({ error: "Solo se permite PDF" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el límite de 20MB" },
        { status: 413 },
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error:
            "Blob storage no configurado: falta la env BLOB_READ_WRITE_TOKEN en el entorno de despliegue.",
        },
        { status: 500 },
      );
    }

    const prev = await prisma.nextRivalFile.findUnique({
      where: { teamId: team.id },
      select: { fileUrl: true },
    });

    const originalName = file.name || "next-rival.pdf";
    const name = safeFileName(originalName);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `openbase/${team.id}/next-rival/${ts}-${name}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const blob = await put(path, buffer, {
      access: "public",
      contentType: "application/pdf",
      token,
    });

    const uploadedAt = new Date();
    const upserted = await prisma.nextRivalFile.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        fileUrl: blob.url,
        fileName: originalName,
        uploadedAt,
      },
      update: {
        fileUrl: blob.url,
        fileName: originalName,
        uploadedAt,
      },
      select: { fileName: true, uploadedAt: true, fileUrl: true },
    });

    // Best-effort delete del blob anterior (no bloquea el flujo si falla).
    try {
      if (prev?.fileUrl) {
        await del(prev.fileUrl, { token });
      }
    } catch (e) {
      console.warn("ct next-rival: failed to delete previous blob", {
        teamId: team.id,
        prevUrl: prev?.fileUrl,
        error: (e as any)?.message || String(e),
      });
    }

    return NextResponse.json({
      exists: true,
      fileName: upserted.fileName,
      uploadedAt: upserted.uploadedAt.toISOString(),
    });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct next-rival POST error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

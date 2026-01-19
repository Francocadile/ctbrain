import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { Role } from "@prisma/client";
import { dbScope } from "@/lib/dbScope";
import { assertCsrf, handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

function isPdfMeta(fileName: string, contentType?: string | null) {
  const name = (fileName || "").toLowerCase();
  const type = (contentType || "").toLowerCase();
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

// POST /api/ct/next-rival (JSON metadata)
export async function POST(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const json = (await req.json().catch(() => null)) as any;
    const fileUrl = typeof json?.fileUrl === "string" ? json.fileUrl : "";
    const pathname = typeof json?.pathname === "string" ? json.pathname : "";
    const fileName = typeof json?.fileName === "string" ? json.fileName : "";
    const contentType = typeof json?.contentType === "string" ? json.contentType : "";
    const size = typeof json?.size === "number" ? json.size : 0;

    if (!fileUrl || !pathname || !fileName) {
      return NextResponse.json(
        { error: "Faltan datos del archivo (fileUrl/pathname/fileName)" },
        { status: 400 },
      );
    }

    if (!isPdfMeta(fileName, contentType)) {
      return NextResponse.json({ error: "Solo se permite PDF" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }
    if (size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el límite de 20MB" },
        { status: 413 },
      );
    }

    const expectedPrefix = `openbase/${team.id}/next-rival/`;
    if (!pathname.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Path inválido" },
        { status: 400 },
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

    const uploadedAt = new Date();
    const upserted = await prisma.nextRivalFile.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        fileUrl,
        fileName,
        uploadedAt,
      },
      update: {
        fileUrl,
        fileName,
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

// DELETE /api/ct/next-rival
export async function DELETE(req: Request) {
  try {
    assertCsrf(req);
    const { prisma, team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const row = await prisma.nextRivalFile.findUnique({
      where: { teamId: team.id },
      select: { fileUrl: true },
    });

    // Idempotente: si no existe, respondemos ok igualmente.
    if (!row) return NextResponse.json({ ok: true, deleted: false });

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

    // Best-effort delete del blob (no bloquea el flujo si falla).
    try {
      if (row.fileUrl) {
        await del(row.fileUrl, { token });
      }
    } catch (e) {
      console.warn("ct next-rival: failed to delete blob", {
        teamId: team.id,
        url: row.fileUrl,
        error: (e as any)?.message || String(e),
      });
    }

    await prisma.nextRivalFile.delete({ where: { teamId: team.id } });

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct next-rival DELETE error", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleUpload } from "@vercel/blob/client";
import { dbScope } from "@/lib/dbScope";
import { handleCsrfError } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

function safePdfSlug(input: unknown) {
  const base = String(input ?? "documento")
    .toLowerCase()
    .replace(/\.pdf$/i, "");

  const slug = base
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return `${slug || "documento"}.pdf`;
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function POST(req: Request) {
  try {
    // Asegura auth + team scope + roles (mismo scope que /api/ct/next-rival)
    const { team } = await dbScope({ req, roles: [Role.CT, Role.ADMIN] });

    const body = await req.json();

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return json(
        {
          error:
            "Blob storage no configurado: falta la env BLOB_READ_WRITE_TOKEN en el entorno de despliegue.",
        },
        { status: 500 },
      );
    }

    // Client Upload flow:
    // - generateClientToken: devolvemos clientToken al browser
    // - uploadCompleted: vercel llama a este mismo endpoint; validamos y respondemos ok
    const result = await handleUpload({
      token,
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        // payload opcional enviado desde el cliente, por si a futuro necesitamos validación extra
        void clientPayload;
        // En este flujo solo permitimos PDFs.
        // Nota: `multipart` en esta API es boolean; el enforcement real lo hace Vercel con allowedContentTypes.
        void multipart;

        if (!pathname.toLowerCase().endsWith(".pdf")) {
          throw new Error("Solo se permite PDF");
        }

        // Forzamos SIEMPRE un pathname team-scoped, ignorando cualquier pathname que venga del cliente.
        // Fuente: team.id (scope) + timestamp + slug seguro.
        const expectedPrefix = `openbase/${team.id}/next-rival/`;
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const safeName = safePdfSlug((body as any)?.filename ?? (clientPayload as any)?.fileName ?? "documento");
        pathname = `${expectedPrefix}${ts}-${safeName}`;

        console.log("[next-rival client-upload] generating pathname", {
          teamId: team.id,
          pathname,
        });

        return {
          pathname,
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          // tokenPayload se devuelve tal cual en uploadCompleted como tokenPayload
          tokenPayload: JSON.stringify({ teamId: team.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Seguridad: validar que el upload pertenece al mismo team
        let payloadTeamId: string | null = null;
        try {
          const parsed = tokenPayload ? JSON.parse(tokenPayload) : null;
          payloadTeamId = parsed?.teamId ?? null;
        } catch {
          payloadTeamId = null;
        }

        if (!payloadTeamId || payloadTeamId !== team.id) {
          throw new Error("Invalid token payload");
        }

        // Nada de DB acá: el cliente hará el POST de confirmación enviando metadata.
        // Aún así, dejamos un log por si hay auditoría.
        console.log("[next-rival client-upload] completed", {
          teamId: team.id,
          pathname: blob.pathname,
          contentType: blob.contentType,
        });
      },
    });

    return json(result);
  } catch (error: any) {
    const csrf = handleCsrfError(error);
    if (csrf) return csrf;
    if (error instanceof Response) return error;
    console.error("ct next-rival client-upload error", error);
    return json({ error: error?.message || "Error" }, { status: 500 });
  }
}

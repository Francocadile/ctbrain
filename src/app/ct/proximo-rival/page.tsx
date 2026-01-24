"use client";

import { useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";

type NextRivalMeta =
  | { exists: false }
  | { exists: true; fileName: string; uploadedAt: string };

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export default function CtProximoRivalPage() {
  const [meta, setMeta] = useState<NextRivalMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamId, setTeamId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const fileLabel = useMemo(() => {
    if (!file) return "Ningún archivo seleccionado";
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `${file.name} (${mb} MB)`;
  }, [file]);

  async function loadMeta() {
    try {
      setError(null);
      const res = await fetch("/api/ct/next-rival", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as any;
      setMeta(data as NextRivalMeta);
      const id = typeof data?.teamId === "string" ? data.teamId : null;
      setTeamId(id);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar el estado actual");
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  function validateSelectedFile(f: File): string | null {
    const name = (f.name || "").toLowerCase();
    const type = (f.type || "").toLowerCase();
    const isPdf = type === "application/pdf" || name.endsWith(".pdf");
    if (!isPdf) return "Solo se permite PDF";
    if (f.size <= 0) return "Archivo vacío";
    if (f.size > MAX_PDF_BYTES) return "El archivo supera el límite de 20MB";
    return null;
  }

  async function uploadPdf() {
    if (!file) {
      setError("Seleccioná un PDF");
      return;
    }

    if (!teamId) {
      setError("No se pudo determinar el equipo. Reintentá recargando la página.");
      return;
    }

    console.log("[ct/proximo-rival] teamId", teamId);

    const v = validateSelectedFile(file);
    if (v) {
      setError(v);
      return;
    }

    try {
      setLoading(true);
      setError(null);

    // 1) Upload directo a Vercel Blob (sin pasar el archivo por la Function)
    // Importante: generamos SIEMPRE un pathname team-scoped desde el cliente.
      const ts = new Date().toISOString().replace(/[:.]/g, "-");

      // Sanitizar filename para path de Blob (slugify estricto):
      // - lower
      // - espacios → "-"
      // - solo [a-z0-9-]
      // - asegurar .pdf
      const base = (file.name || "documento.pdf").toLowerCase();
      const withoutExt = base.replace(/\.pdf$/i, "");
      const slug = withoutExt
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");

      const ensuredPdf = `${slug || "documento"}.pdf`;

  const blobPath = `openbase/${teamId}/next-rival/${ts}-${ensuredPdf}`;

  console.log("[ct/proximo-rival] blobPath", blobPath);

      const blob = await upload(blobPath, file, {
        access: "public",
        contentType: "application/pdf",
        // Este endpoint implementa el flow handleUpload (genera client token y recibe callback)
        handleUploadUrl: "/api/ct/next-rival/client-upload",
      });

      // TEMP DEBUG (diagnóstico): confirmar el pathname real que se manda al backend
  console.log("[ct/proximo-rival] saving", { fileUrl: blob.url, pathname: blob.pathname });

      // Cinturón de seguridad: si el blob.pathname no es team-scoped, no intentamos guardar y evitamos el 400.
      const expectedPrefix = `openbase/${teamId}/next-rival/`;
      if (!blob.pathname?.startsWith(expectedPrefix)) {
        throw new Error(
          JSON.stringify(
            {
              error: "Path inválido (client-check)",
              expectedPrefix,
              receivedPathname: blob.pathname ?? null,
              teamId,
            },
            null,
            2,
          ),
        );
      }

      // 2) Confirmar/persistir metadata en DB (1 solo activo por equipo)
      // CSRF pattern del repo: assertCsrf acepta X-CT-CSRF: "1" o "ctb".
      const res = await fetch("/api/ct/next-rival", {
        method: "POST",
        headers: {
          "X-CT-CSRF": "1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: blob.url,
          // El backend exige openbase/{teamId}/next-rival/*.
          // El upload() se inicia con openbase/next-rival/* pero el handshake lo reescribe.
          // Guardamos SIEMPRE el pathname final que devuelve Blob.
          pathname: blob.pathname,
          fileName: file.name,
          contentType: blob.contentType ?? "application/pdf",
          size: file.size,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Mostrar el JSON completo si viene (incluye expectedPrefix/receivedPathname)
        try {
          const parsed = text ? JSON.parse(text) : null;
          if (parsed && typeof parsed === "object") {
            throw new Error(JSON.stringify(parsed, null, 2));
          }
        } catch {
          // noop
        }
        throw new Error(text || res.statusText);
      }

      alert("PDF subido correctamente");
      setFile(null);
      await loadMeta();
    } catch (e: any) {
      setError(e?.message || "No se pudo subir el PDF");
    } finally {
      setLoading(false);
    }
  }

  async function removePdf() {
    if (!meta || !meta.exists) return;

    const ok = confirm("¿Eliminar el informe PDF del próximo rival?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/ct/next-rival", {
        method: "DELETE",
        headers: {
          "X-CT-CSRF": "1",
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText);
      }

      alert("PDF eliminado");
      setFile(null);
      await loadMeta();
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar el PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-4 md:px-6 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">Próximo rival (PDF)</h1>
          <p className="text-sm text-gray-600">
            Subí o reemplazá el informe PDF del próximo rival. Se mantiene un solo archivo activo por equipo.
          </p>
        </header>

        <section className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Estado actual</h2>

          {meta === null ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : meta.exists ? (
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="text-gray-500">Archivo:</span> {meta.fileName}
              </div>
              <div>
                <span className="text-gray-500">Subido:</span> {meta.uploadedAt.slice(0, 10)}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={removePdf}
                  disabled={loading}
                  className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay PDF cargado todavía.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Subir / Reemplazar</h2>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setError(null);
                setFile(f);
              }}
            />
            <div className="text-xs text-gray-500">{fileLabel}</div>
          </div>

          <button
            type="button"
            onClick={uploadPdf}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Subiendo…" : "Subir / Reemplazar"}
          </button>
        </section>
      </div>
    </main>
  );
}

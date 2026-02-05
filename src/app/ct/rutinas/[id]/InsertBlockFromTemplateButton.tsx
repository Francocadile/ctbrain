"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TemplateHit = {
  id: string;
  title: string;
  blockType: string;
  updatedAt: string;
};

export default function InsertBlockFromTemplateButton({
  routineId,
  insertAt,
}: {
  routineId: string;
  insertAt?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateHit[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setError(null);
        const res = await fetch("/api/ct/block-templates", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar templates");
        setTemplates(Array.isArray(json?.templates) ? json.templates : []);
      } catch (e: any) {
        setError(e?.message || "Error");
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.title.toLowerCase().includes(q));
  }, [templates, query]);

  async function handleInsert(templateId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/ct/routines/${routineId}/blocks/from-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CT-CSRF": "1",
        },
        body: JSON.stringify({ templateId, insertAt }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "No se pudo insertar el bloque");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
      >
        Insertar desde template
      </button>

      {!open ? null : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="text-sm font-medium">Insertar bloque desde template</div>
                <div className="text-xs text-muted-foreground">Elegí un template para clonar</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border bg-background px-3 py-1 text-sm hover:bg-muted"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 space-y-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                autoFocus
              />

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="max-h-80 overflow-auto rounded-md border">
                {filtered.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Sin templates</div>
                ) : null}

                {filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleInsert(t.id)}
                    className="block w-full text-left p-3 hover:bg-muted disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.blockType || "-"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

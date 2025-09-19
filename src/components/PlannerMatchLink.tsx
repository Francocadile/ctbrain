"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type RivalMini = { id: string; name: string; logoUrl?: string | null };

type Props = {
  /** Si viene el id, enlazamos directo. */
  rivalId?: string | null;
  /** Fallback por nombre si no hay id. */
  rivalName?: string | null;
  /** Texto del botón/enlace. */
  label?: string;
  className?: string;
};

/**
 * Enlaza al plan del rival:
 * - Si hay rivalId: /ct/rivales/:id
 * - Si no hay id pero hay nombre: resuelve via /api/ct/rivales/search y usa el mejor match
 * - Si no encuentra, cae a /ct/rivales?search=...
 */
export default function PlannerMatchLink({
  rivalId,
  rivalName,
  label = "Plan de partido",
  className,
}: Props) {
  const [resolved, setResolved] = useState<RivalMini | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanName = (rivalName || "").trim();

  const directHref = useMemo(() => {
    if (rivalId) return `/ct/rivales/${rivalId}`;
    return "";
  }, [rivalId]);

  useEffect(() => {
    let abort = false;

    async function run() {
      if (directHref || !cleanName) {
        setResolved(null);
        return;
      }
      try {
        setLoading(true);
        const r = await fetch(`/api/ct/rivales/search?q=${encodeURIComponent(cleanName)}&limit=5`, {
          cache: "no-store",
        });
        const j = await r.json().catch(() => ({} as any));
        const list: RivalMini[] = Array.isArray(j?.data) ? j.data : [];
        // 1) exacto case-insensitive
        const exact =
          list.find((x) => x.name?.toLowerCase() === cleanName.toLowerCase()) || null;
        if (!abort) setResolved(exact || list[0] || null);
      } catch {
        if (!abort) setResolved(null);
      } finally {
        if (!abort) setLoading(false);
      }
    }

    run();
    return () => {
      abort = true;
    };
  }, [directHref, cleanName]);

  const href = useMemo(() => {
    if (directHref) return directHref;
    if (resolved?.id) return `/ct/rivales/${resolved.id}`;
    if (cleanName) return `/ct/rivales?search=${encodeURIComponent(cleanName)}`;
    return `/ct/rivales`;
  }, [directHref, resolved, cleanName]);

  return (
    <a
      href={href}
      className={clsx(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] hover:bg-gray-100 whitespace-nowrap",
        className
      )}
      title={resolved?.name || cleanName || "Plan de partido"}
      aria-busy={loading}
    >
      {label}
    </a>
  );
}

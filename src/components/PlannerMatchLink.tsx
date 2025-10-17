"use client";
import Link, { LinkProps } from "next/link";
import * as React from "react";

type Props = LinkProps & {
  children?: React.ReactNode;
  className?: string;
};

export default function PlannerMatchLink({ href, children, className, ...rest }: Props) {
  return (
    <Link href={href} className={className} {...rest}>
      {children ?? "Ver"}
    </Link>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type RivalMini = { id: string; name: string; logoUrl?: string | null };

type Props = {
  /** Si viene el id, enlazamos directo a /ct/rivales/:id */
  rivalId?: string | null;
  /** Si no hay id, intentamos resolver por nombre (search API) */
  rivalName?: string | null;
  /** Texto del botón/enlace */
  label?: string;
  className?: string;
  /** URL de fallback si no hay id y tampoco se resolvió por nombre */
  fallbackHref?: string;
  /** Pestaña destino del rival (por defecto: "plan") */
  tab?: string;
};

/**
 * Enlaza al plan del rival:
 * - Si hay rivalId: /ct/rivales/:id?tab=<tab>
 * - Si no hay id pero hay nombre: resuelve via /api/ct/rivales/search y usa el mejor match
 * - Si no encuentra, usa fallbackHref si viene; si no, cae a /ct/rivales?search=... o /ct/rivales
 */
export default function PlannerMatchLink({
  rivalId,
  rivalName,
  label = "Plan de partido",
  className,
  fallbackHref,
  tab = "plan",
}: Props) {
  const [resolved, setResolved] = useState<RivalMini | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanName = (rivalName || "").trim();

  const directHref = useMemo(() => {
    if (!rivalId) return "";
    const suffix = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    return `/ct/rivales/${rivalId}${suffix}`;
  }, [rivalId, tab]);

  useEffect(() => {
    let abort = false;

    async function run() {
      // Si ya tenemos link directo o no hay nombre, no buscamos
      if (directHref || !cleanName) {
        setResolved(null);
        return;
      }
      try {
        setLoading(true);
        const r = await fetch(
          `/api/ct/rivales/search?q=${encodeURIComponent(cleanName)}&limit=5`,
          { cache: "no-store" }
        );
        if (!r.ok) return;
        const j = await r.json().catch(() => ({} as any));
        const list: RivalMini[] = Array.isArray(j?.data) ? j.data : [];

        // match exacto (case-insensitive) o primer resultado
        const exact =
          list.find((x) => x.name?.toLowerCase() === cleanName.toLowerCase()) ||
          null;

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
    if (resolved?.id) {
      const suffix = tab ? `?tab=${encodeURIComponent(tab)}` : "";
      return `/ct/rivales/${resolved.id}${suffix}`;
    }
    if (fallbackHref) return fallbackHref;
    if (cleanName) return `/ct/rivales?search=${encodeURIComponent(cleanName)}`;
    return `/ct/rivales`;
  }, [directHref, resolved, fallbackHref, cleanName, tab]);

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

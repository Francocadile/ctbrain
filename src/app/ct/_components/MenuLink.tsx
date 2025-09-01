"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import React from "react";

/**
 * Acepta rutas tipadas (Route) y también string literal.
 * El casteo a Route al render es seguro para rutas internas.
 */
type Href = Route | (string & {});

export default function MenuLink({
  href,
  soon,
  children,
}: {
  href?: Href;
  soon?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Item deshabilitado ("PRONTO")
  if (!href) {
    return (
      <span className="block rounded-md px-3 py-1.5 text-[13px] text-gray-400 cursor-not-allowed">
        {children} {soon && <small className="ml-1">PRONTO</small>}
      </span>
    );
  }

  const hrefStr = String(href);

  // Soporte simple a enlaces externos
  const isExternal = /^https?:\/\//i.test(hrefStr);

  // Activo si coincide exacto o es prefijo del path actual
  const active =
    !isExternal &&
    (pathname === hrefStr || pathname.startsWith(hrefStr + "/"));

  const baseCls =
    "block rounded-md px-3 py-1.5 text-[13px] transition-colors";
  const activeCls = active ? "bg-gray-900 text-white" : "hover:bg-gray-50";

  if (isExternal) {
    return (
      <a
        href={hrefStr}
        target="_blank"
        rel="noreferrer"
        className={`${baseCls} ${activeCls}`}
      >
        {children}
      </a>
    );
  }

  // Rutas internas -> Link con typedRoutes (cast seguro)
  return (
    <Link href={href as Route} className={`${baseCls} ${activeCls}`} prefetch={false}>
      {children}
    </Link>
  );
}

// src/app/ct/rivales/[id]/layout.tsx
import Link from "next/link";
import { ReactNode } from "react";
import { headers } from "next/headers";

function isActive(pathname: string, href: string) {
  if (href.endsWith("/")) href = href.slice(0, -1);
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  // activo si coincide exacto o si pathname empieza por href y el resto es vacío
  return pathname === href;
}

export default function RivalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const id = params.id;
  const hdrs = headers();
  const currentPath = hdrs.get("x-invoke-path") // Next la setea en runtime
    || hdrs.get("referer") // fallback
    || `/ct/rivales/${id}`;

  const base = `/ct/rivales/${id}`;

  const tabs = [
    { href: `${base}`, label: "Resumen" },
    { href: `${base}/plan`, label: "Plan de partido" },
    { href: `${base}/videos`, label: "Videos" },
    { href: `${base}/estadisticas`, label: "Estadísticas" },
    { href: `${base}/notas`, label: "Notas internas" },
    { href: `${base}/visibilidad`, label: "Visibilidad" },
    { href: `${base}/importar`, label: "Importar" },
    { href: `${base}/plantel`, label: "Plantel" }, // ⬅️ NUEVA PESTAÑA
  ];

  return (
    <div className="w-full">
      {/* Barra de pestañas */}
      <nav className="border-b mb-6">
        <div className="flex gap-6 px-6">
          {tabs.map((t) => {
            const active = isActive(currentPath, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={
                  "py-3 border-b-2 -mb-px transition-colors " +
                  (active
                    ? "border-black text-black font-medium"
                    : "border-transparent text-gray-500 hover:text-black")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Contenido de cada subpágina */}
      <div>{children}</div>
    </div>
  );
}

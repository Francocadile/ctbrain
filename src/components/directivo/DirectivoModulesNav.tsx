"use client";

import Link from "next/link";

const cards = [
  {
    key: "videos",
    title: "Videos",
    description: "Análisis audiovisual del equipo y rivales.",
    href: "/directivo/videos",
    badge: "Nuevo",
  },
  {
    key: "reportes",
    title: "Reportes",
    description: "Informes clave preparados por el CT.",
    href: "/directivo/informes",
  },
  {
    key: "estadisticas",
    title: "Estadísticas",
    description: "Indicadores y tendencias del plantel.",
    href: "#estadisticas",
  },
  {
    key: "gps",
    title: "GPS",
    description: "Módulo en desarrollo.",
    href: "#",
    disabled: true,
  },
  {
    key: "lesiones",
    title: "Lesiones",
    description: "Módulo en desarrollo.",
    href: "#",
    disabled: true,
  },
];

export default function DirectivoModulesNav() {
  return (
    <nav className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Módulos directivo">
      {cards.map((card) => (
        <ModuleCard key={card.key} card={card} />
      ))}
    </nav>
  );
}

type CardProps = {
  card: (typeof cards)[number];
};

function ModuleCard({ card }: CardProps) {
  const { title, description, href, badge, disabled } = card;
  const content = (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition ${
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
          : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge && !disabled ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
      {disabled ? (
        <p className="mt-3 text-[11px] font-medium text-gray-400">En desarrollo</p>
      ) : (
        <p className="mt-3 text-[11px] font-medium text-gray-600">Ir al módulo →</p>
      )}
    </div>
  );

  if (disabled) {
    return <div>{content}</div>;
  }

  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900">
      {content}
    </Link>
  );
}

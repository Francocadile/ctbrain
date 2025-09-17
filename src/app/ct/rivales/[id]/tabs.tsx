// src/app/ct/rivales/[id]/tabs.tsx
"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import clsx from "clsx";

type Tab = { slug: string; label: string };
export default function Tabs({
  baseHref,
  tabs,
}: {
  baseHref: string;
  tabs: Tab[];
}) {
  const segments = useSelectedLayoutSegments(); // p.ej. ["ct","rivales",":id","videos"]
  const current = segments.at(-1) ?? "";        // última parte de la ruta

  return (
    <nav className="border-b">
      <ul className="flex flex-wrap gap-6 text-sm">
        {tabs.map((t) => {
          const href = t.slug ? `${baseHref}/${t.slug}` : baseHref;
          const active = (t.slug || "") === (current || "");
          return (
            <li key={t.slug || "root"}>
              <Link
                href={href}
                className={clsx(
                  "inline-block py-3",
                  active
                    ? "font-semibold border-b-2 border-black"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

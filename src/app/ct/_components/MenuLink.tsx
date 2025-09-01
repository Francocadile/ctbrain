// src/app/ct/_components/MenuLink.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MenuLink({
  href,
  children,
  soon = false,
}: {
  href?: string;
  children: React.ReactNode;
  soon?: boolean;
}) {
  const pathname = usePathname();
  const active = href ? pathname === href || pathname.startsWith(`${href}/`) : false;

  if (soon || !href) {
    return (
      <div className="px-3 py-1.5 text-[13px] text-gray-400 cursor-not-allowed">
        {children} <span className="text-[11px] ml-1">PRONTO</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-1.5 text-[13px] ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}

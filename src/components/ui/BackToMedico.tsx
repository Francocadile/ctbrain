"use client";

import Link from "next/link";

export default function BackToMedico() {
  return (
    <Link
      href="/medico"
      className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
    >
      <span aria-hidden="true">←</span>
      <span>Volver</span>
    </Link>
  );
}

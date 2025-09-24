// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

// Evita que Next intente prerenderizar estático y
// permite hooks de navegación sin warnings.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}

// src/app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}

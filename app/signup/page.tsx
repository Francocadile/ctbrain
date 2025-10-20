// src/app/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Cargando…</div>}>
      <SignupClient />
    </Suspense>
  );
}

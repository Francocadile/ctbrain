// src/components/admin/ApproveToggle.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveToggle({
  id,
  initial,
}: {
  id: string;
  initial: boolean;
}) {
  const [approved, setApproved] = useState<boolean>(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !approved;

    try {
      const r = await fetch(`/api/users/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "No se pudo actualizar");

      setApproved(next);
      router.refresh(); // 👈 actualiza el Server Component con la tabla
    } catch (e: any) {
      alert(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 ${
        busy ? "opacity-60" : ""
      } ${approved ? "text-amber-700" : "text-emerald-700"}`}
      title={approved ? "Suspender acceso" : "Aprobar acceso"}
    >
      {approved ? "Suspender" : "Aprobar"}
    </button>
  );
}

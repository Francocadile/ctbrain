"use client";

import { useState } from "react";

export default function ImportarPdf({ rivalId }: { rivalId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onImport() {
    try {
      setMsg("");
      if (!file) { setMsg("Seleccioná un PDF"); return; }
      setLoading(true);
      const fd = new FormData();
      fd.append("file", file); // *** nombre de campo correcto ***
      const res = await fetch(`/api/ct/rivales/${rivalId}/import/pdf`, {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        setMsg(j.message || "Listo");
      } catch {
        setMsg(text);
      }
    } catch (err: any) {
      setMsg(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        disabled={loading}
        onClick={onImport}
        className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? "Importando..." : "Importar PDF"}
      </button>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

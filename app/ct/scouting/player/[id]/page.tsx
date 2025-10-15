// src/app/ct/scouting/player/[id]/page.tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { getPlayer, type ScoutingPlayer } from "@/lib/scouting";
import Container from "@/components/ui/container";

export default function ScoutingPlayerPage({ params }: { params: { id: string } }) {
  const [row, setRow] = useState<ScoutingPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getPlayer(params.id);
      setRow(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.id]);

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Ficha de jugador</h1>
          <p className="text-xs md:text-sm text-gray-500">Datos, contactos y videos.</p>
        </div>
        <Link href={"/ct/scouting" as Route} className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-xs">
          ← Scouting
        </Link>
      </div>

      {loading ? (
        <div className="p-4 text-gray-500">Cargando…</div>
      ) : !row ? (
        <div className="p-4 text-gray-500 italic">Jugador no encontrado.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-2xl border bg-white p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Datos</div>
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-500">Nombre:</span> {row.fullName}</div>
              <div><span className="text-gray-500">Posición:</span> {(row.positions || []).join("/") || "—"}</div>
              <div><span className="text-gray-500">Club:</span> {row.club || "—"}</div>
              <div><span className="text-gray-500">Estado:</span> {row.estado}</div>
              <div><span className="text-gray-500">Rating:</span> {row.rating ?? "—"}</div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Contacto</div>
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-500">Agente:</span> {row.agentName || "—"}</div>
              <div><span className="text-gray-500">Tel. agente:</span> {row.agentPhone || "—"}</div>
              <div><span className="text-gray-500">Email agente:</span> {row.agentEmail || "—"}</div>
              <div><span className="text-gray-500">Tel. jugador:</span> {row.playerPhone || "—"}</div>
              <div><span className="text-gray-500">Email jugador:</span> {row.playerEmail || "—"}</div>
              <div><span className="text-gray-500">Instagram:</span> {row.instagram || "—"}</div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-3 md:col-span-2">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Videos</div>
            {row.videos?.length ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {row.videos.map((v, i) => (
                  <li key={i}>
                    <a className="underline text-emerald-700 break-all" href={v} target="_blank" rel="noreferrer">
                      {v}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">Sin videos</div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-3 md:col-span-2">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">Notas</div>
            <div className="text-sm whitespace-pre-wrap">{row.notes || "—"}</div>
          </section>
        </div>
      )}
    </Container>
  );
}

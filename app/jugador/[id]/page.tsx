"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type RivalBasics = {
  id: string;
  name: string;
  logoUrl: string | null;
  coach?: string | null;
  baseSystem?: string | null;
  nextMatchDate?: string | null;
  nextMatchCompetition?: string | null;
};

type RivalPlan = {
  charlaUrl: string | null;
  report: {
    system: string | null;
    strengths: string[];
    weaknesses: string[];
    keyPlayers: string[];
    setPieces: { for: string[]; against: string[] };
  };
};

type RivalVideo = { title?: string | null; url: string };
type RivalStats = {
  totals?: { gf?: number; ga?: number; possession?: number };
  recent?: { date?: string; opponent?: string; comp?: string; homeAway?: string; gf?: number; ga?: number }[];
};
type RivalNotes = { observations?: string; checklist?: { text: string; done?: boolean }[] };

type PlayerPayload = {
  basics: RivalBasics;
  plan: RivalPlan;
  videos: RivalVideo[];
  stats: RivalStats;
  notes: RivalNotes | null;
  visibility: any;
  squad: { number?: number | null; name: string; position?: string | null; video?: { title?: string | null; url?: string | null } | null }[];
};

export default function JugadorRivalPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PlayerPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/ct/rivales/${id}/player`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        setData(json?.data || null);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="p-4 text-gray-500">Cargando…</div>;
  if (!data) return (
    <div className="p-4 space-y-2">
      <div className="text-red-500">Rival no disponible</div>
      <Link href="/jugador/dashboard" className="text-sm underline">← Volver</Link>
    </div>
  );

  const { basics, plan, videos, stats, notes, squad } = data;
  const nm = basics.nextMatchDate
    ? (() => {
        const d = new Date(basics.nextMatchDate);
        try {
          const s = d.toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
          return `${s}${basics.nextMatchCompetition ? ` • ${basics.nextMatchCompetition}` : ""}`;
        } catch { return "—"; }
      })()
    : "—";

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-sm text-gray-600">
        <Link href="/jugador/dashboard" className="underline">Inicio</Link>
        <span className="mx-1">/</span>
        <span className="font-medium">{basics.name}</span>
      </div>

      <header className="flex items-center gap-4 border-b pb-3">
        {basics.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={basics.logoUrl} alt={basics.name} className="h-16 w-16 rounded border object-contain bg-white" />
        ) : <div className="h-16 w-16 rounded border bg-gray-100" />}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{basics.name}</h1>
          <p className="text-sm text-gray-600">DT: <b>{basics.coach || "—"}</b> • Sistema base: {basics.baseSystem || "—"}</p>
          <p className="text-sm text-gray-600">Próximo partido: {nm}</p>
        </div>
      </header>

      {/* Informe visual */}
      <section className="rounded-xl border bg-white p-4 space-y-4">
        {plan.charlaUrl && (
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">Charla oficial</div>
            <a href={plan.charlaUrl} target="_blank" rel="noreferrer" className="text-sm underline">Abrir charla →</a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          {plan.report.system ? <InfoBlock title="Sistema" content={plan.report.system} /> : null}
          {plan.report.keyPlayers?.length ? <ListBlock title="Jugadores clave" items={plan.report.keyPlayers} /> : null}
          {plan.report.strengths?.length ? <ListBlock title="Fortalezas" items={plan.report.strengths} /> : null}
          {plan.report.weaknesses?.length ? <ListBlock title="Debilidades" items={plan.report.weaknesses} /> : null}
          {plan.report.setPieces?.for?.length ? <ListBlock title="Balón parado (a favor)" items={plan.report.setPieces.for} /> : null}
          {plan.report.setPieces?.against?.length ? <ListBlock title="Balón parado (en contra)" items={plan.report.setPieces.against} /> : null}
        </div>
      </section>

      {/* Plantel */}
      {Array.isArray(squad) && squad.length > 0 && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">Plantel</h2>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 w-16">#</th>
                  <th className="text-left p-2">Jugador</th>
                  <th className="text-left p-2 w-40">Posición</th>
                  <th className="text-left p-2">Video</th>
                </tr>
              </thead>
              <tbody>
                {squad.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{p.number ?? "—"}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.position || "—"}</td>
                    <td className="p-2">
                      {p.video?.url ? (
                        <a href={p.video.url} className="underline" target="_blank" rel="noreferrer">
                          {p.video.title || p.video.url}
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Videos */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Videos</h2>
        {(!data.videos || data.videos.length === 0) ? (
          <div className="text-sm text-gray-500">Sin videos.</div>
        ) : (
          <ul className="list-disc pl-4 text-sm">
            {data.videos.map((v, i) => (
              <li key={i}>
                <a href={v.url} className="underline" target="_blank" rel="noreferrer">
                  {v.title || v.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stats */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Estadísticas</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="GF" value={data.stats?.totals?.gf} />
          <StatBox label="GC" value={data.stats?.totals?.ga} />
          <StatBox label="% Posesión" value={data.stats?.totals?.possession} />
        </div>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Rival</th>
                <th className="text-left p-2">Comp</th>
                <th className="text-left p-2">Loc</th>
                <th className="text-right p-2">GF</th>
                <th className="text-right p-2">GC</th>
              </tr>
            </thead>
            <tbody>
              {(data.stats?.recent || []).length === 0 && (
                <tr><td colSpan={6} className="p-2 text-gray-500">Sin datos.</td></tr>
              )}
              {(data.stats?.recent || []).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.date || "—"}</td>
                  <td className="p-2">{r.opponent || "—"}</td>
                  <td className="p-2">{r.comp || "—"}</td>
                  <td className="p-2">{r.homeAway || "—"}</td>
                  <td className="p-2 text-right">{Number.isFinite(r.gf as number) ? r.gf : "—"}</td>
                  <td className="p-2 text-right">{Number.isFinite(r.ga as number) ? r.ga : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notas (si el CT lo habilitó) */}
      {notes && (
        <section className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">Notas del CT</h2>
          <div className="rounded-lg border p-3 bg-gray-50">
            <div className="text-sm whitespace-pre-wrap">{notes.observations || "—"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">Checklist</div>
            <ul className="space-y-1">
              {(notes.checklist || []).length === 0 && <li className="text-sm text-gray-500">Sin ítems.</li>}
              {(notes.checklist || []).map((it, i) => (
                <li key={i} className="text-sm">
                  {it.done ? "✅ " : "⬜ "} {it.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoBlock({ title, content }: { title: string; content?: string | null }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">{title}</div>
      <div className="text-sm text-gray-800">{content || "—"}</div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[12px] font-semibold uppercase tracking-wide mb-1">{title}</div>
      {items && items.length ? (
        <ul className="list-disc pl-4 text-sm text-gray-800 space-y-0.5">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">—</div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value?: number }) {
  const show = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="rounded-lg border p-3 bg-gray-50">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{show ? value : "—"}</div>
    </div>
  );
}

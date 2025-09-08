"use client";
import * as React from "react";
import HelpTip from "@/components/HelpTip";
import InjuryEditor from "@/components/InjuryEditor";

type PlayerOpt = { id: string; label: string; sub?: string };
type InjuryRow = {
  id: string; userId: string; userName: string; date: string;
  status: "ACTIVE"|"RETURN"|"CLEAR";
  availability: "OUT"|"MODIFIED"|"FULL";
  zone?: string|null; note?: string|null;
  capMinutes?: number|null; noSprint?: boolean|null; noCoD?: boolean|null;
  gymOnly?: boolean|null; noContact?: boolean|null;
  expectedReturn?: string|null; severity?: string|null; mechanism?: string|null; side?: string|null;
};

function toYMD(d: Date) { return d.toISOString().slice(0,10); }

export default function InjuriesPage() {
  type Tab = "diario" | "estadisticas" | "protocolos";
  const [tab, setTab] = React.useState<Tab>("diario");

  const [date, setDate] = React.useState<string>(toYMD(new Date()));
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<InjuryRow[]>([]);
  const [query, setQuery] = React.useState("");

  // alta rápida
  const [players, setPlayers] = React.useState<PlayerOpt[]>([]);
  const [pick, setPick] = React.useState<string>("");
  const [zone, setZone] = React.useState<string>("");
  const [status, setStatus] = React.useState<"ACTIVE"|"RETURN"|"CLEAR">("ACTIVE");
  const [saving, setSaving] = React.useState(false);

  // editor
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<InjuryRow | null>(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch("/api/users/players", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setPlayers(data);
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/injuries?date=${date}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const fixed: InjuryRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
        ...r,
        userName: r.userName || r.user?.name || r.user?.email || "Jugador",
      }));
      setRows(fixed);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  async function quickSave() {
    if (!pick) return alert("Elegí un jugador");
    setSaving(true);
    try {
      const body = { userId: pick, date, zone: zone || null, status, availability: "MODIFIED" };
      const res = await fetch("/api/injuries", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setZone(""); setStatus("ACTIVE");
      await load();
    } catch (e:any) {
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const filtered = React.useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      r.userName.toLowerCase().includes(t) ||
      (r.zone || "").toLowerCase().includes(t) ||
      (r.note || "").toLowerCase().includes(t)
    );
  }, [rows, query]);

  // KPIs sencillos
  const kpis = React.useMemo(() => {
    const n = rows.length;
    const act = rows.filter(r => r.status === "ACTIVE").length;
    const ret = rows.filter(r => r.status === "RETURN").length;
    const alta = rows.filter(r => r.status === "CLEAR").length;
    return { n, act, ret, alta, outPct30d: 0 };
  }, [rows]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            Lesionados — Diario{" "}
            <HelpTip text="Registro operativo diario cargado por Cuerpo Médico. El CT ve disponibilidades y restricciones para planificar." />
          </h1>
          <p className="text-xs text-gray-500">{rows.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border px-2 py-1.5 text-sm"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
          />
          <button onClick={load} className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50">
            Recargar
          </button>
          <button
            onClick={() => {
              const header = ["Jugador","Fecha","Estado","Disponibilidad","Zona","Notas"];
              const lines = [header.join(",")];
              for (const r of filtered) {
                lines.push([
                  `"${r.userName.replace(/"/g,'""')}"`,
                  r.date,
                  r.status,
                  r.availability,
                  r.zone ? `"${r.zone.replace(/"/g,'""')}"` : "",
                  r.note ? `"${r.note.replace(/"/g,'""')}"` : "",
                ].join(","));
              }
              const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `lesiones_${date}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="rounded-xl border bg-white p-1 flex gap-1">
        {[
          ["diario","Diario"],
          ["estadisticas","Estadísticas"],
          ["protocolos","Protocolos"],
        ].map(([k, label]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={()=>setTab(k as any)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-black text-white" : "hover:bg-gray-50"}`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* ----- Tab: Diario ----- */}
      {tab === "diario" && (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["ACTIVOS", kpis.act, "Jugadores con caso activo hoy."],
              ["REINTEGRO", kpis.ret, "En readaptación / retorno progresivo."],
              ["ALTAS HOY", kpis.alta, "Casos con alta dada hoy."],
              ["ENTRADAS 30D", kpis.n, "Registros creados en 30 días."],
              ["% OUT (30D)", "—", "Porcentaje OUT promedio (próx. corte rolling)."],
            ].map(([lbl,val,tip])=>(
              <div key={lbl} className="rounded-xl border bg-white p-3">
                <div className="text-[11px] uppercase text-gray-500 flex items-center gap-1">
                  {lbl} <HelpTip text={String(tip)} />
                </div>
                <div className="mt-1 text-2xl font-bold">{val as any}</div>
              </div>
            ))}
          </section>

          {/* Alta rápida */}
          <section className="rounded-xl border bg-white p-3">
            <div className="text-sm font-medium mb-2">
              Alta rápida{" "}
              <HelpTip text="Elegí jugador, zona/nota y estado. Después podés completar detalles y restricciones." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <div className="text-[11px] uppercase text-gray-500 mb-1">Jugador</div>
                <select
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  value={pick}
                  onChange={(e)=>setPick(e.target.value)}
                >
                  <option value="">— Elegir —</option>
                  {players.map(p=>(
                    <option key={p.id} value={p.id}>
                      {p.label}{p.sub ? ` — ${p.sub}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <label className="text-sm">
                Zona corporal / nota breve{" "}
                <HelpTip text="Ej: isquios der., aductor izq., tobillo. Usa texto breve; detalle largo va en 'Notas' del editor." />
                <input
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  value={zone}
                  onChange={(e)=>setZone(e.target.value)}
                  placeholder="ej: isquios der."
                />
              </label>

              <label className="text-sm">
                Estado{" "}
                <HelpTip text="ACTIVE: caso vigente. RETURN: reintegro. CLEAR: alta definitiva." />
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                  value={status}
                  onChange={(e)=>setStatus(e.target.value as any)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="RETURN">RETURN</option>
                  <option value="CLEAR">CLEAR</option>
                </select>
              </label>
            </div>

            <div className="mt-2">
              <button
                onClick={quickSave}
                disabled={saving}
                className={`rounded-lg px-3 py-1.5 text-sm ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
              >
                Guardar
              </button>
            </div>
          </section>

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <input
              className="w-full md:w-80 rounded-md border px-2 py-1.5 text-sm"
              placeholder="Buscar jugador / zona / nota…"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
            />
            <span className="text-[12px] text-gray-500">{filtered.length} resultado(s)</span>
          </div>

          {/* Tabla del día */}
          <section className="rounded-2xl border bg-white overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-[12px] font-semibold uppercase">
              Entradas del día
            </div>
            {loading ? (
              <div className="p-4 text-gray-500">Cargando…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-gray-500 italic">Sin datos</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-2">Jugador</th>
                      <th className="text-left px-3 py-2">Estado</th>
                      <th className="text-left px-3 py-2">Disp.</th>
                      <th className="text-left px-3 py-2">Zona/Nota</th>
                      <th className="text-left px-3 py-2">Restric.</th>
                      <th className="text-right px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{r.userName}</td>
                        <td className="px-3 py-2">{r.status}</td>
                        <td className="px-3 py-2">{r.availability}</td>
                        <td className="px-3 py-2">{r.zone || r.note || "—"}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {[
                            r.capMinutes!=null ? `cap ${r.capMinutes}’` : null,
                            r.noSprint ? "noSprint" : null,
                            r.noCoD ? "noCoD" : null,
                            r.gymOnly ? "gymOnly" : null,
                            r.noContact ? "noContact" : null,
                          ].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setEditRow(r); setEditOpen(true); }}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                            >
                              Detalle
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("¿Eliminar registro?")) return;
                                const res = await fetch(`/api/injuries/${r.id}`, { method: "DELETE" });
                                if (!res.ok) alert(await res.text());
                                await load();
                              }}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ----- Tab: Estadísticas (ligera, sin libs) ----- */}
      {tab === "estadisticas" && (
        <section className="rounded-2xl border bg-white p-4">
          <div className="text-[12px] font-semibold uppercase mb-2">
            Resumen 14 días <HelpTip text="Conteos simples por severidad, mecanismo y disponibilidad (últimos 14 días)." />
          </div>
          <Stats14 />
        </section>
      )}

      {/* ----- Tab: Protocolos ----- */}
      {tab === "protocolos" && (
        <section className="rounded-2xl border bg-white p-4 text-sm text-gray-700 space-y-2">
          <div className="text-[12px] font-semibold uppercase">Protocolos / Pautas</div>
          <p>
            Espacio para subir o pegar pautas del Cuerpo Médico (readaptación, criterios de alta, retornos por zona).
            Podés empezar con texto plano y luego lo hacemos vinculable por tipo de lesión.
          </p>
        </section>
      )}

      {/* Editor */}
      {editRow && (
        <InjuryEditor
          open={editOpen}
          onClose={()=>setEditOpen(false)}
          row={editRow}
          onSaved={()=>load()}
        />
      )}
    </div>
  );
}

/* ---------- Subcomponente de stats (14 días) ---------- */
function Stats14() {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const today = toYMD(new Date());
        const from = toYMD(new Date(Date.now() - 13*24*3600*1000));
        const res = await fetch(`/api/injuries/range?from=${from}&to=${today}`, { cache: "no-store" });
        const data = res.ok ? await res.json() : [];
        setItems(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-gray-500">Calculando…</div>;
  if (!items.length) return <div className="text-gray-500 italic">Sin datos aún</div>;

  const countBy = (key: string) => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = (it[key] ?? "—") as string;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
  };

  const box = (title:string, pairs:[string,number][]) => (
    <div className="rounded-xl border p-3">
      <div className="text-[11px] uppercase text-gray-500 mb-2">{title}</div>
      <ul className="space-y-1 text-sm">
        {pairs.slice(0,6).map(([k,v])=>(
          <li key={k} className="flex items-center justify-between">
            <span className="text-gray-700">{k}</span>
            <span className="font-semibold">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {box("Por severidad", countBy("severity"))}
      {box("Por mecanismo", countBy("mechanism"))}
      {box("Por disponibilidad", countBy("availability"))}
    </div>
  );
}

"use client";
import * as React from "react";
import HelpTip from "@/components/HelpTip";

type Props = {
  open: boolean;
  onClose: () => void;
  row: any;            // InjuryEntry con user, etc.
  onSaved?: () => void;
};

export default function InjuryEditor({ open, onClose, row, onSaved }: Props) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>({
    availability: row?.availability ?? "MODIFIED",
    capMinutes: row?.capMinutes ?? null,
    noSprint: !!row?.noSprint,
    noCoD: !!row?.noCoD,
    gymOnly: !!row?.gymOnly,
    noContact: !!row?.noContact,
    severity: row?.severity ?? null,
    mechanism: row?.mechanism ?? null,
    side: row?.side ?? null,
    expectedReturn: row?.expectedReturn?.slice?.(0,10) ?? "",
    note: row?.note ?? "",
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      availability: row?.availability ?? "MODIFIED",
      capMinutes: row?.capMinutes ?? null,
      noSprint: !!row?.noSprint,
      noCoD: !!row?.noCoD,
      gymOnly: !!row?.gymOnly,
      noContact: !!row?.noContact,
      severity: row?.severity ?? null,
      mechanism: row?.mechanism ?? null,
      side: row?.side ?? null,
      expectedReturn: row?.expectedReturn?.slice?.(0,10) ?? "",
      note: row?.note ?? "",
    });
  }, [open, row]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/injuries/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved?.();
      onClose();
    } catch (e:any) {
      alert(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-3">
      <div className="w-full max-w-2xl card">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="label-ui text-ink-500">Detalle lesional</div>
            <div className="h4 text-ink-900 font-semibold tracking-tight">{row?.userName || "Jugador"}</div>
          </div>
          <button onClick={onClose} className="btn-secondary ui-min">Cerrar</button>
        </header>
        <div className="p-4 space-y-4">
          {/* Disponibilidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="small text-ink-700">
              Disponibilidad{" "}
              <HelpTip text="OUT: no entrena. MODIFIED: con restricciones. FULL: sin restricciones." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 small"
                value={form.availability}
                onChange={e=>setForm((f:any)=>({ ...f, availability: e.target.value }))}
              >
                <option value="OUT">OUT</option>
                <option value="MODIFIED">MODIFIED</option>
                <option value="FULL">FULL</option>
              </select>
            </label>
            <label className="small text-ink-700">
              Cap de minutos{" "}
              <HelpTip text="Límite operativo sugerido por CM. El CT lo usa en Plan y RPE." />
              <input
                className="mt-1 w-full rounded-md border px-2 py-1.5 small tabular"
                placeholder="ej: 30"
                inputMode="numeric"
                value={form.capMinutes ?? ""}
                onChange={e=>setForm((f:any)=>({ ...f, capMinutes: e.target.value===""?null:Number(e.target.value) }))}
              />
            </label>
            <label className="small text-ink-700">
              Fecha estimada de regreso{" "}
              <HelpTip text="ETA (estimación) de alta deportiva. Ajustable día a día." />
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-2 py-1.5 small"
                value={form.expectedReturn}
                onChange={e=>setForm((f:any)=>({ ...f, expectedReturn: e.target.value }))}
              />
            </label>
          </div>
          {/* Restricciones operativas */}
          <div className="card p-3">
            <div className="micro label-ui mb-2">Restricciones</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 small text-ink-700">
              {[
                ["noSprint","Sin Sprint"],
                ["noCoD","Sin CoD"],
                ["gymOnly","Gym Only"],
                ["noContact","Sin Contacto"],
              ].map(([k,label])=>(
                <label key={k} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!form[k as keyof typeof form]}
                    onChange={e=>setForm((f:any)=>({ ...f, [k]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {/* Clínica */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="small text-ink-700">
              Severidad{" "}
              <HelpTip text="MENOR 1–3d, MODERADA 4–28d, SEVERA >28d (referencia adaptable)." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 small"
                value={form.severity ?? ""}
                onChange={e=>setForm((f:any)=>({ ...f, severity: e.target.value || null }))}
              >
                <option value="">—</option>
                <option value="MINOR">MINOR</option>
                <option value="MODERATE">MODERATE</option>
                <option value="SEVERE">SEVERE</option>
              </select>
            </label>
            <label className="small text-ink-700">
              Mecanismo{" "}
              <HelpTip text="CONTACT / NON_CONTACT / OVERUSE / UNKNOWN." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 small"
                value={form.mechanism ?? ""}
                onChange={e=>setForm((f:any)=>({ ...f, mechanism: e.target.value || null }))}
              >
                <option value="">—</option>
                <option value="CONTACT">CONTACT</option>
                <option value="NON_CONTACT">NON_CONTACT</option>
                <option value="OVERUSE">OVERUSE</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </label>
            <label className="small text-ink-700">
              Lateralidad{" "}
              <HelpTip text="Izq/Der/Bilateral cuando aplique (miembro inferior/superior)." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 small"
                value={form.side ?? ""}
                onChange={e=>setForm((f:any)=>({ ...f, side: e.target.value || null }))}
              >
                <option value="">—</option>
                <option value="LEFT">LEFT</option>
                <option value="RIGHT">RIGHT</option>
                <option value="BILATERAL">BILATERAL</option>
              </select>
            </label>
          </div>
          <label className="block small text-ink-700">
            Notas{" "}
            <HelpTip text="Observaciones clínicas y pautas de trabajo. Se muestran al CT en Plan." />
            <textarea
              className="mt-1 w-full rounded-md border px-2 py-1.5 small"
              rows={4}
              value={form.note}
              onChange={e=>setForm((f:any)=>({ ...f, note: e.target.value }))}
            />
          </label>
        </div>
        <footer className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary ui-min">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className={`btn-primary ui-min ${saving ? "opacity-60" : ""}`}
          >
            Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}

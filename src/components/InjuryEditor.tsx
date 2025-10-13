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
      <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-xl">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Detalle lesional</div>
            <div className="font-semibold">{row?.userName || "Jugador"}</div>
          </div>
          <button onClick={onClose} className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50">Cerrar</button>
        </header>

        <div className="p-4 space-y-4">
          {/* Disponibilidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm">
              Disponibilidad{" "}
              <HelpTip text="OUT: no entrena. MODIFIED: con restricciones. FULL: sin restricciones." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.availability}
                onChange={e=>setForm((f:any)=>({ ...f, availability: e.target.value }))}
              >
                <option value="OUT">OUT</option>
                <option value="MODIFIED">MODIFIED</option>
                <option value="FULL">FULL</option>
              </select>
            </label>

            <label className="text-sm">
              Cap de minutos{" "}
              <HelpTip text="Límite operativo sugerido por CM. El CT lo usa en Plan y RPE." />
              <input
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                placeholder="ej: 30"
                inputMode="numeric"
                value={form.capMinutes ?? ""}
                onChange={e=>setForm((f:any)=>({ ...f, capMinutes: e.target.value===""?null:Number(e.target.value) }))}
              />
            </label>

            <label className="text-sm">
              Fecha estimada de regreso{" "}
              <HelpTip text="ETA (estimación) de alta deportiva. Ajustable día a día." />
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.expectedReturn}
                onChange={e=>setForm((f:any)=>({ ...f, expectedReturn: e.target.value }))}
              />
            </label>
          </div>

          {/* Restricciones operativas */}
          <div className="rounded-xl border p-3">
            <div className="text-[12px] font-semibold uppercase mb-2">
              Restricciones{" "}
              <HelpTip text="Flags que ve el CT para adaptar tareas: sin sprint, sin cambios de dirección, solo gym, sin contacto." />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
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
            <label className="text-sm">
              Severidad{" "}
              <HelpTip text="MENOR 1–3d, MODERADA 4–28d, SEVERA >28d (referencia adaptable)." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                value={form.severity ?? ""}
                onChange={e=>setForm((f:any)=>({ ...f, severity: e.target.value || null }))}
              >
                <option value="">—</option>
                <option value="MINOR">MINOR</option>
                <option value="MODERATE">MODERATE</option>
                <option value="SEVERE">SEVERE</option>
              </select>
            </label>

            <label className="text-sm">
              Mecanismo{" "}
              <HelpTip text="CONTACT / NON_CONTACT / OVERUSE / UNKNOWN." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
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

            <label className="text-sm">
              Lateralidad{" "}
              <HelpTip text="Izq/Der/Bilateral cuando aplique (miembro inferior/superior)." />
              <select
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
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

          <label className="block text-sm">
            Notas{" "}
            <HelpTip text="Observaciones clínicas y pautas de trabajo. Se muestran al CT en Plan." />
            <textarea
              className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
              rows={4}
              value={form.note}
              onChange={e=>setForm((f:any)=>({ ...f, note: e.target.value }))}
            />
          </label>
        </div>

        <footer className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className={`rounded-md px-3 py-1.5 text-sm ${saving ? "bg-gray-200 text-gray-500" : "bg-black text-white hover:opacity-90"}`}
          >
            Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}

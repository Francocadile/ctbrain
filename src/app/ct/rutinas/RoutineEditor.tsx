"use client";
import { useState } from "react";
import { DEFAULT_SECTIONS, RoutineSectionId, RoutineExercise, RoutinePlan } from "@/types/routine";
import { postJSON, getJSON } from "@/lib/api";

const emptyExercise = (order: number): RoutineExercise => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  sets: 1,
  order,
});

export default function RoutineEditor({ mode, rutinaId }: { mode: "nuevo" | "edit"; rutinaId?: string }) {
  const [day, setDay] = useState("");
  const [userId, setUserId] = useState("");
  const [sections, setSections] = useState<Record<RoutineSectionId, RoutineExercise[]>>({
    warmup: [],
    A: [],
    B: [],
    C: [],
  });
  const [msg, setMsg] = useState("");

  // Cargar rutina si es edición
  // ...aquí iría la lógica de carga con getJSON si rutinaId existe...

  function addExercise(section: RoutineSectionId) {
    setSections(s => ({
      ...s,
      [section]: [...s[section], emptyExercise(s[section].length + 1)],
    }));
  }

  function updateExercise(section: RoutineSectionId, idx: number, field: keyof RoutineExercise, value: any) {
    setSections(s => ({
      ...s,
      [section]: s[section].map((ex, i) => i === idx ? { ...ex, [field]: value } : ex),
    }));
  }

  function removeExercise(section: RoutineSectionId, idx: number) {
    setSections(s => ({
      ...s,
      [section]: s[section].filter((_, i) => i !== idx),
    }));
  }

  function clearSection(section: RoutineSectionId) {
    setSections(s => ({ ...s, [section]: [] }));
  }

  async function handleSave() {
    setMsg("");
    // Validaciones mínimas
    for (const sec of DEFAULT_SECTIONS) {
      for (const ex of sections[sec]) {
        if (!ex.name || !ex.sets) {
          setMsg("Completa nombre y sets en todos los ejercicios.");
          return;
        }
      }
    }
    const plan: RoutinePlan = { day, sections };
    try {
      if (mode === "edit" && rutinaId) {
        await postJSON(`/api/routines/${rutinaId}`, { day, ejercicios: plan });
        setMsg("Rutina actualizada");
      } else {
        await postJSON(`/api/routines`, { day, ejercicios: plan, userId });
        setMsg("Rutina creada");
      }
    } catch {
      setMsg("Error al guardar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <input type="date" className="border rounded-lg p-2" value={day} onChange={e => setDay(e.target.value)} required />
        {mode === "nuevo" && (
          <input type="text" className="border rounded-lg p-2" placeholder="ID jugador" value={userId} onChange={e => setUserId(e.target.value)} />
        )}
      </div>
      {DEFAULT_SECTIONS.map(section => (
        <div key={section} className="border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{section === "warmup" ? "Entrada en calor" : `Bloque ${section}`}</span>
            <button className="text-xs text-red-500 underline" onClick={() => clearSection(section)}>Vaciar sección</button>
          </div>
          <div className="space-y-2">
            {sections[section].map((ex, idx) => (
              <div key={ex.id} className="grid grid-cols-7 gap-2 items-center bg-gray-50 rounded p-2">
                <input type="text" className="border rounded p-1 col-span-2" placeholder="Nombre" value={ex.name} onChange={e => updateExercise(section, idx, "name", e.target.value)} required />
                <input type="number" className="border rounded p-1" placeholder="Sets" value={ex.sets} min={1} onChange={e => updateExercise(section, idx, "sets", Number(e.target.value))} required />
                <input type="text" className="border rounded p-1" placeholder="Reps" value={ex.reps || ""} onChange={e => updateExercise(section, idx, "reps", e.target.value)} />
                <input type="text" className="border rounded p-1" placeholder="Tempo" value={ex.tempo || ""} onChange={e => updateExercise(section, idx, "tempo", e.target.value)} />
                <input type="number" className="border rounded p-1" placeholder="Pausa (seg)" value={ex.restSec || ""} onChange={e => updateExercise(section, idx, "restSec", Number(e.target.value))} />
                <input type="text" className="border rounded p-1" placeholder="Carga" value={ex.load || ""} onChange={e => updateExercise(section, idx, "load", e.target.value)} />
                <button className="text-xs text-red-500 underline" onClick={() => removeExercise(section, idx)}>Eliminar</button>
              </div>
            ))}
            <button className="bg-blue-600 text-white px-3 py-1 rounded-lg mt-2" onClick={() => addExercise(section)}>Añadir ejercicio</button>
          </div>
        </div>
      ))}
      <button className="bg-green-600 text-white px-4 py-2 rounded-lg" onClick={handleSave}>Guardar rutina</button>
      {msg && <div className={`mt-2 text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</div>}
    </div>
  );
}

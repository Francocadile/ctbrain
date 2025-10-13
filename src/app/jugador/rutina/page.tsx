import { getJSON, postJSON } from '@/lib/api';
import { useState } from 'react';

export default async function RutinaJugadorPage() {
  let rutina = null;
  try {
    const rutinas = await getJSON<any[]>('/api/routines');
    rutina = rutinas[0] || null;
  } catch {
    rutina = null;
  }

  if (!rutina) {
    return <div className="p-6 text-center">Sin rutina asignada</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Rutina de fuerza</h2>
      <div className="mb-4">
        <strong>Día:</strong> {new Date(rutina.day).toLocaleDateString()}
      </div>
      <div className="mb-4">
        <strong>Ejercicios:</strong>
        <ul className="list-disc ml-6">
          {Array.isArray(rutina.ejercicios)
            ? rutina.ejercicios.map((ej: any, i: number) => (
                <li key={i}>{typeof ej === 'string' ? ej : JSON.stringify(ej)}</li>
              ))
            : <li>{JSON.stringify(rutina.ejercicios)}</li>}
        </ul>
      </div>
      <FeedbackForm rutinaId={rutina.id} feedback={rutina.feedback} />
    </div>
  );
}

function FeedbackForm({ rutinaId, feedback }: { rutinaId: string; feedback?: string }) {
  const [value, setValue] = useState(feedback || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    try {
      await postJSON(`/api/routines`, { feedback: value, rutinaId });
      setMsg('Feedback enviado');
    } catch {
      setMsg('Error al enviar feedback');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label className="block mb-2 font-medium">Feedback</label>
      <textarea
        className="w-full border rounded p-2 mb-2"
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={3}
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar feedback'}
      </button>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </form>
  );
}


"use client";
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
    return (
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-2xl font-semibold mb-4">Rutina de fuerza</h2>
        <div className="text-center text-gray-500 py-8">Sin rutina asignada todavía.</div>
      </div>
    );
  }

  // Render RoutinePlan si existe
  const plan = rutina.ejercicios?.sections ? rutina.ejercicios : null;
  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Rutina de fuerza</h2>
      <div className="mb-4">
        <span className="font-medium">Día:</span> {new Date(rutina.day).toLocaleDateString()}
      </div>
      {plan ? (
        <div className="space-y-6">
          {Object.entries(plan.sections).map(([section, ejercicios]) => {
            const ejerciciosList = Array.isArray(ejercicios) ? ejercicios : [];
            return (
              <div key={section} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-lg">
                  {section === 'warmup' ? 'Entrada en calor' : `Bloque ${section}`}
                </h3>
                {!ejerciciosList.length && <div className="text-gray-400">Sin ejercicios en esta sección.</div>}
                <ul className="space-y-2">
                  {ejerciciosList.map((ej: any, idx: number) => (
                    <li key={ej.id || idx} className="bg-gray-50 rounded p-2">
                      <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                        <span className="font-medium text-blue-700">{ej.name}</span>
                        {ej.videoId && ej.videoUrl && (
                          <VideoEmbed url={ej.videoUrl} />
                        )}
                        {ej.videoUrl && !ej.videoId && <VideoEmbed url={ej.videoUrl} />}
                        {ej.sets && <span className="badge bg-blue-100 text-blue-800 ml-2">{ej.sets} sets</span>}
                        {ej.reps && <span className="badge bg-green-100 text-green-800 ml-2">{ej.reps} reps</span>}
                        {ej.tempo && <span className="badge bg-yellow-100 text-yellow-800 ml-2">Tempo: {ej.tempo}</span>}
                        {ej.restSec && <span className="badge bg-gray-200 text-gray-800 ml-2">Pausa: {ej.restSec}s</span>}
                        {ej.load && <span className="badge bg-purple-100 text-purple-800 ml-2">Carga: {ej.load}</span>}
                        {ej.unilateral && <span className="badge bg-pink-100 text-pink-800 ml-2">Unilateral</span>}
                      </div>
                      {ej.notes && <div className="text-sm text-gray-600 mt-1">{ej.notes}</div>}
                      {ej.equipment && ej.equipment.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">Equipo: {ej.equipment.join(', ')}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-4">
          <span className="font-medium">Ejercicios:</span>
          <ul className="list-disc ml-6">
            {Array.isArray(rutina.ejercicios)
              ? rutina.ejercicios.map((ej: any, i: number) => (
                  <li key={i}>{typeof ej === 'string' ? ej : JSON.stringify(ej)}</li>
                ))
              : <li>{JSON.stringify(rutina.ejercicios)}</li>}
          </ul>
        </div>
      )}
      <FeedbackForm rutinaId={rutina.id} feedback={rutina.feedback} />
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  if (url.includes('youtube') || url.includes('youtu.be')) {
    const videoId = url.split('v=')[1] || url.split('/').pop();
    return (
      <iframe width="220" height="124" src={`https://www.youtube.com/embed/${videoId}`} title="Video" frameBorder="0" allowFullScreen className="rounded" />
    );
  }
  if (url.includes('vimeo')) {
    const videoId = url.split('/').pop();
    return (
      <iframe width="220" height="124" src={`https://player.vimeo.com/video/${videoId}`} title="Video" frameBorder="0" allowFullScreen className="rounded" />
    );
  }
  if (url.endsWith('.mp4')) {
    return (
      <video width="220" height="124" controls className="rounded">
        <source src={url} type="video/mp4" />
        Tu navegador no soporta el video.
      </video>
    );
  }
  return null;
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
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <label className="block mb-2 font-medium">Feedback</label>
      <textarea
        className="w-full border rounded-lg p-2 mb-2 focus:outline-none focus:ring focus:border-blue-300"
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={3}
        placeholder="Dejá tu comentario sobre la rutina..."
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar feedback'}
      </button>
      {msg && <div className={`mt-2 text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</div>}
    </form>
  );
}

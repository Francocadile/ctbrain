
"use client";
import { getJSON, postJSON } from '@/lib/api';
import { useState } from 'react';

export default async function VideosJugadorPage() {
  let videos: any[] = [];
  let vistos: Record<string, number> = {};
  try {
    videos = await getJSON<any[]>('/api/videos');
    const viewlog = await getJSON<{ logs: any[]; conteo: Record<string, number> }>(`/api/viewlog?entityType=VIDEO`);
    vistos = viewlog.conteo || {};
  } catch {
    videos = [];
    vistos = {};
  }

  if (!videos.length) {
    return (
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8">
  <h2 className="text-2xl font-semibold mb-4">Videos del DT</h2>
  <div className="text-center text-gray-500 py-8">Sin videos disponibles.</div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <h2 className="text-2xl font-semibold mb-4">Videos del DT</h2>
      <div className="grid gap-4">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} vistos={vistos[video.id] || 0} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video, vistos }: { video: any; vistos: number }) {
  const [visto, setVisto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function marcarVisto() {
    setLoading(true);
    try {
      await postJSON('/api/viewlog', {
        entityType: 'VIDEO',
        entityId: video.id,
      });
      setVisto(true);
      setMsg('¡Marcado como visto!');
    } catch {
      setMsg('Error al marcar como visto');
    }
    setLoading(false);
  }

  return (
    <div className="border rounded-lg p-4 shadow space-y-2">
      <div className="font-semibold mb-2">{video.title}</div>
      <div className="mb-2">
  <a href={video.url} target="_blank" rel="noopener" className="text-blue-600 underline">Ver video</a>
  <div className="text-xs mt-1">Visto por {vistos} usuario(s)</div>
      </div>
      <button
  className={`px-3 py-1 rounded-lg ${visto ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'} transition`}
        onClick={marcarVisto}
        disabled={visto || loading}
      >
        {visto ? 'Visto' : loading ? 'Marcando...' : 'Marcar como visto'}
      </button>
  {msg && <div className={`text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</div>}
    </div>
  );
}

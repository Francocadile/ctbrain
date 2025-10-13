
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
  <h2 className="h2 text-ink-900 mb-4 tracking-tight">Videos del DT</h2>
  <div className="text-center text-ink-500 py-8">Sin videos disponibles.</div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <h2 className="h2 text-ink-900 mb-4 tracking-tight">Videos del DT</h2>
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
    <div className="card space-y-2">
      <div className="h3 text-ink-900 mb-2 tracking-tight">{video.title}</div>
      <div className="mb-2">
  <a href={video.url} target="_blank" rel="noopener" className="btn-secondary">Ver video</a>
  <div className="micro text-ink-500 mt-1">Visto por {vistos} usuario(s)</div>
      </div>
      <button
  className={`btn-primary ui-min ${visto ? 'opacity-60' : ''}`}
        onClick={marcarVisto}
        disabled={visto || loading}
      >
        {visto ? 'Visto' : loading ? 'Marcando...' : 'Marcar como visto'}
      </button>
  {msg && <div className={`small ${msg.includes('Error') ? 'badge-error' : 'badge-success'}`}>{msg}</div>}
    </div>
  );
}


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
    return <div className="p-6 text-center">Sin videos disponibles</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Videos del DT</h2>
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

  async function marcarVisto() {
    setLoading(true);
    try {
      await postJSON('/api/viewlog', {
        entityType: 'VIDEO',
        entityId: video.id,
      });
      setVisto(true);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="border rounded p-4 shadow">
      <div className="font-semibold mb-2">{video.title}</div>
      <div className="mb-2">
        <a href={video.url} target="_blank" rel="noopener" className="text-blue-600 underline">Ver video</a>
        <div className="text-xs mt-1">Visto por {vistos} usuario(s)</div>
      </div>
      <button
        className={`px-3 py-1 rounded ${visto ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}
        onClick={marcarVisto}
        disabled={visto || loading}
      >
        {visto ? 'Visto' : loading ? 'Marcando...' : 'Marcar visto'}
      </button>
    </div>
  );
}

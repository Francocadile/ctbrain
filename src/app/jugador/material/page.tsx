
"use client";
import { getJSON, postJSON } from '@/lib/api';
import { useState } from 'react';

export default async function MaterialJugadorPage() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  let assets: any[] = [];
  try {
    assets = await getJSON<any[]>(`/api/assets?weekStart=${weekStart.toISOString()}`);
  } catch {
    assets = [];
  }

  if (!assets.length) {
    return (
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-2xl font-semibold mb-4">Material de la semana</h2>
        <div className="text-center text-gray-500 py-8">Sin materiales esta semana.</div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Material de la semana</h2>
      <div className="grid gap-4">
        {assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: any }) {
  const [visto, setVisto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function marcarVisto() {
    setLoading(true);
    try {
      await postJSON('/api/viewlog', {
        entityType: 'ASSET',
        entityId: asset.id,
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
      <div className="font-semibold mb-2">{asset.title}</div>
      <div className="mb-2">
        {asset.type === 'PDF' && asset.url && (
          <a href={asset.url} target="_blank" rel="noopener" className="text-blue-600 underline">Ver PDF</a>
        )}
        {asset.type === 'LINK' && asset.url && (
          <a href={asset.url} target="_blank" rel="noopener" className="text-blue-600 underline">Abrir enlace</a>
        )}
        {asset.type === 'NOTE' && asset.note && (
          <div className="bg-gray-100 p-2 rounded">{asset.note}</div>
        )}
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

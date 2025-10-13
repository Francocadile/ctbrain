
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
    return <div className="p-6 text-center">Sin materiales asignados</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Material semanal</h2>
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

  async function marcarVisto() {
    setLoading(true);
    try {
      await postJSON('/api/viewlog', {
        entityType: 'ASSET',
        entityId: asset.id,
      });
      setVisto(true);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="border rounded p-4 shadow">
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
        className={`px-3 py-1 rounded ${visto ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}
        onClick={marcarVisto}
        disabled={visto || loading}
      >
        {visto ? 'Visto' : loading ? 'Marcando...' : 'Marcar visto'}
      </button>
    </div>
  );
}


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
  <h2 className="h2 text-ink-900 mb-4 tracking-tight">Material de la semana</h2>
  <div className="text-center text-ink-500 py-8">Sin materiales esta semana.</div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <h2 className="h2 text-ink-900 mb-4 tracking-tight">Material de la semana</h2>
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
    <div className="card space-y-2">
      <div className="h3 text-ink-900 mb-2 tracking-tight">{asset.title}</div>
      <div className="mb-2">
        {asset.type === 'PDF' && asset.url && (
          <a href={asset.url} target="_blank" rel="noopener" className="btn-secondary">Ver PDF</a>
        )}
        {asset.type === 'LINK' && asset.url && (
          <a href={asset.url} target="_blank" rel="noopener" className="btn-secondary">Abrir enlace</a>
        )}
        {asset.type === 'NOTE' && asset.note && (
          <div className="bg-base-50 p-2 rounded small text-ink-700">{asset.note}</div>
        )}
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

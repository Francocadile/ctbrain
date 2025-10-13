
"use client";
import { getJSON, postJSON } from '@/lib/api';
import { useState } from 'react';

const assetTypes = [
  { value: 'PDF', label: 'PDF' },
  { value: 'LINK', label: 'Enlace' },
  { value: 'NOTE', label: 'Nota' },
];
const audiences = [
  { value: 'ALL', label: 'Todos' },
  { value: 'JUGADOR', label: 'Jugadores' },
  { value: 'CT', label: 'Cuerpo Técnico' },
  { value: 'MEDICO', label: 'Médicos' },
];

export default async function ShareCTPage() {
  let assets: any[] = [];
  try {
    assets = await getJSON<any[]>('/api/assets');
  } catch {
    assets = [];
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Compartir material</h2>
      <AssetForm />
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Material compartido</h3>
        <div className="grid gap-4">
          {assets.map(asset => (
            <div key={asset.id} className="border rounded-lg p-4">
              <div className="font-semibold">{asset.title}</div>
              <div className="text-xs">{asset.type} • {asset.audience}</div>
              <div className="text-xs">Semana: {new Date(asset.weekStart).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetForm() {
  const [form, setForm] = useState({
    title: '',
    type: 'PDF',
    url: '',
    note: '',
    weekStart: '',
    audience: 'ALL',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    try {
      await postJSON('/api/assets', form);
      setMsg('Material compartido');
    } catch {
      setMsg('Error al compartir');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-2">
      <input
        type="text"
        placeholder="Título del material"
        className="w-full border rounded-lg p-2 focus:outline-none focus:ring focus:border-blue-300"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        required
      />
      <select
        className="w-full border rounded-lg p-2"
        value={form.type}
        onChange={e => setForm({ ...form, type: e.target.value })}
      >
        {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {form.type !== 'NOTE' && (
        <input
          type="text"
          placeholder="URL (si aplica)"
          className="w-full border rounded-lg p-2"
          value={form.url}
          onChange={e => setForm({ ...form, url: e.target.value })}
        />
      )}
      {form.type === 'NOTE' && (
        <textarea
          placeholder="Nota"
          className="w-full border rounded-lg p-2"
          value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })}
        />
      )}
      <input
        type="date"
        className="w-full border rounded-lg p-2"
        value={form.weekStart}
        onChange={e => setForm({ ...form, weekStart: e.target.value })}
        required
      />
      <select
        className="w-full border rounded-lg p-2"
        value={form.audience}
        onChange={e => setForm({ ...form, audience: e.target.value })}
      >
        {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" disabled={loading}>
        {loading ? 'Compartiendo...' : 'Compartir'}
      </button>
      {msg && <div className={`mt-2 text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</div>}
    </form>
  );
}

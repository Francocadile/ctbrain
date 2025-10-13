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
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Compartir material</h2>
      <AssetForm />
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Material compartido</h3>
        <div className="grid gap-4">
          {assets.map(asset => (
            <div key={asset.id} className="border rounded p-4">
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
    <form onSubmit={handleSubmit} className="mb-6">
      <input
        type="text"
        placeholder="Título"
        className="w-full border rounded p-2 mb-2"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        required
      />
      <select
        className="w-full border rounded p-2 mb-2"
        value={form.type}
        onChange={e => setForm({ ...form, type: e.target.value })}
      >
        {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {form.type !== 'NOTE' && (
        <input
          type="text"
          placeholder="URL"
          className="w-full border rounded p-2 mb-2"
          value={form.url}
          onChange={e => setForm({ ...form, url: e.target.value })}
        />
      )}
      {form.type === 'NOTE' && (
        <textarea
          placeholder="Nota"
          className="w-full border rounded p-2 mb-2"
          value={form.note}
          onChange={e => setForm({ ...form, note: e.target.value })}
        />
      )}
      <input
        type="date"
        className="w-full border rounded p-2 mb-2"
        value={form.weekStart}
        onChange={e => setForm({ ...form, weekStart: e.target.value })}
        required
      />
      <select
        className="w-full border rounded p-2 mb-2"
        value={form.audience}
        onChange={e => setForm({ ...form, audience: e.target.value })}
      >
        {audiences.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
        {loading ? 'Compartiendo...' : 'Compartir'}
      </button>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </form>
  );
}

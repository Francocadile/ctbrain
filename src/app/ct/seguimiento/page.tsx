
"use client";
import { getJSON } from '@/lib/api';
import { useState } from 'react';

const entityTypes = [
  { value: '', label: 'Todos' },
  { value: 'ROUTINE', label: 'Rutinas' },
  { value: 'ASSET', label: 'Materiales' },
  { value: 'VIDEO', label: 'Videos' },
];

export default async function SeguimientoCTPage() {
  const [filtros, setFiltros] = useState({ entityType: '', desde: '', hasta: '' });
  let logs: any[] = [];
  let conteo: Record<string, number> = {};
  try {
    const params = [];
    if (filtros.entityType) params.push(`entityType=${filtros.entityType}`);
    if (filtros.desde) params.push(`desde=${filtros.desde}`);
    if (filtros.hasta) params.push(`hasta=${filtros.hasta}`);
    const url = `/api/viewlog${params.length ? '?' + params.join('&') : ''}`;
    const res = await getJSON<{ logs: any[]; conteo: Record<string, number> }>(url);
    logs = res.logs;
    conteo = res.conteo;
  } catch {
    logs = [];
    conteo = {};
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Seguimiento de visualizaciones</h2>
      <Filtros filtros={filtros} setFiltros={setFiltros} />
      <TablaSeguimiento logs={logs} conteo={conteo} />
    </div>
  );
}

function Filtros({ filtros, setFiltros }: any) {
  return (
    <form className="mb-4 flex gap-2 items-end">
      <select
        className="border rounded-lg p-2"
        value={filtros.entityType}
        onChange={e => setFiltros((f: any) => ({ ...f, entityType: e.target.value }))}
      >
        {entityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input
        type="date"
        className="border rounded-lg p-2"
        value={filtros.desde}
        onChange={e => setFiltros((f: any) => ({ ...f, desde: e.target.value }))}
      />
      <input
        type="date"
        className="border rounded-lg p-2"
        value={filtros.hasta}
        onChange={e => setFiltros((f: any) => ({ ...f, hasta: e.target.value }))}
      />
    </form>
  );
}

function TablaSeguimiento({ logs, conteo }: { logs: any[]; conteo: Record<string, number> }) {
  if (!logs.length) return <div className="text-center text-gray-500 py-8">Sin registros.</div>;
  return (
    <table className="w-full border">
      <thead>
        <tr>
          <th className="border px-2 py-1">ID</th>
          <th className="border px-2 py-1">Tipo</th>
          <th className="border px-2 py-1">Usuario</th>
          <th className="border px-2 py-1">Fecha</th>
          <th className="border px-2 py-1">Vistos</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(log => (
          <tr key={log.id}>
            <td className="border px-2 py-1">{log.entityId}</td>
            <td className="border px-2 py-1">{log.entityType}</td>
            <td className="border px-2 py-1">{log.userId}</td>
            <td className="border px-2 py-1">{new Date(log.viewedAt).toLocaleString()}</td>
            <td className="border px-2 py-1">{conteo[log.entityId] || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

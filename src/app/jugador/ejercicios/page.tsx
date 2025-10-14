import { MarkAsViewedButton } from '@/components/MarkAsViewedButton';

export default async function JugadorEjerciciosPage() {
  const res = await fetch('/api/player/ejercicios', { cache: 'no-store' });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 404) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold mb-4">Ejercicios del día</h1>
        <div className="text-gray-500">Sin ejercicios visibles por ahora.</div>
      </div>
    );
  }
  if (!res.ok || !data?.ejercicios) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold mb-4">Ejercicios del día</h1>
        <div className="text-gray-500">Error al cargar los ejercicios.</div>
      </div>
    );
  }
  const { ejercicios } = data;
  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-4">Ejercicios del día</h1>
      <div className="space-y-4">
        {ejercicios.map((ex: any) => (
          <div key={ex.id} className="rounded-xl border p-3 bg-white flex items-center justify-between">
            <div>
              <div className="font-semibold">{ex.title}</div>
              {ex.description && <div className="text-sm text-gray-600">{ex.description}</div>}
            </div>
            <MarkAsViewedButton entityType="EXERCISE" entityId={ex.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

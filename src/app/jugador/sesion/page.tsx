import { MarkAsViewedButton } from '@/components/MarkAsViewedButton';

export default async function JugadorSesionPage() {
  const res = await fetch('/api/player/sesion', { cache: 'no-store' });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 404 && data?.code === 'NO_VISIBLE_SESSION') {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold mb-4">Sesión del día</h1>
        <div className="text-gray-500">Sin sesión publicada para hoy.</div>
      </div>
    );
  }
  if (!res.ok || !data?.sesion) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold mb-4">Sesión del día</h1>
        <div className="text-gray-500">Error al cargar la sesión.</div>
      </div>
    );
  }
  const { sesion } = data;
  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-4">{sesion.title}</h1>
      <div className="mb-2 text-gray-600">{sesion.description}</div>
      <MarkAsViewedButton entityType="SESSION" entityId={sesion.id} />
      <div className="space-y-4 mt-6">
        <h2 className="text-xl font-semibold">Ejercicios visibles</h2>
        {(!sesion.exercises || sesion.exercises.length === 0) ? (
          <div className="text-gray-500">Sin ejercicios visibles</div>
        ) : (
          sesion.exercises.map((ex: any) => (
            <div key={ex.id} className="rounded-xl border p-3 bg-white">
              <div className="font-semibold">{ex.title}</div>
              {ex.description && <div className="text-sm text-gray-600">{ex.description}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

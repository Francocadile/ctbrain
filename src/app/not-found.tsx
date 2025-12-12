export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="max-w-md w-full px-6 py-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-sm text-slate-300">
          La página que buscás no existe o ya no está disponible.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-600 transition"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

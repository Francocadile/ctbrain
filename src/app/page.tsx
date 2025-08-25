import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container-aura p-6 space-y-4">
      <h2 className="text-2xl font-semibold">CTBrain – Fase 1 (Auth + Roles)</h2>
      <p className="text-white/80">
        Usá <b>/login</b> para iniciar sesión. Tras el login te llevamos a tu panel según rol.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/login" className="rounded-2xl bg-brand-500 px-3 py-1.5 hover:bg-brand-600">
          Ir a Login
        </Link>
        <Link href="/admin" className="rounded-2xl bg-white/10 px-3 py-1.5 hover:bg-white/20">
          /admin
        </Link>
        <Link href="/ct" className="rounded-2xl bg-white/10 px-3 py-1.5 hover:bg-white/20">
          /ct
        </Link>
        <Link href="/medico" className="rounded-2xl bg-white/10 px-3 py-1.5 hover:bg-white/20">
          /medico
        </Link>
        <Link href="/jugador" className="rounded-2xl bg-white/10 px-3 py-1.5 hover:bg-white/20">
          /jugador
        </Link>
        <Link href="/directivo" className="rounded-2xl bg-white/10 px-3 py-1.5 hover:bg-white/20">
          /directivo
        </Link>
      </div>
      <div className="pt-2 text-xs text-white/50">
        Usuarios seed: <code>admin@ctbrain.app</code>, <code>ct@ctbrain.app</code>,{" "}
        <code>medico@ctbrain.app</code>, <code>jugador@ctbrain.app</code>,{" "}
        <code>directivo@ctbrain.app</code> (contraseña: <code>123456</code>).
      </div>
    </div>
  );
}

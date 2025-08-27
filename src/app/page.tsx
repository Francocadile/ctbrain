// app/page.tsx
import Link from "next/link";

export default function Home() {
  const links = [
    { href: "/login", label: "Ir a Login" },
    { href: "/admin", label: "Admin" },
    { href: "/ct", label: "Cuerpo Técnico" },
    { href: "/medico", label: "Médico" },
    { href: "/jugador", label: "Jugador" },
    { href: "/directivo", label: "Directivo" },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            CTBrain — Fase 1 (Auth + Roles)
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Portada provisional para navegar mientras cerramos autenticación y
            permisos por rol. Próximo paso: proteger rutas y armar el dashboard maestro.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="text-lg font-semibold">{l.label}</div>
              <div className="mt-1 text-sm text-gray-500">{l.href}</div>
            </Link>
          ))}
        </section>

        <footer className="mt-16 text-xs text-gray-500">
          <p>
            Roadmap inmediato: (1) Guard de rol en páginas de servidor, (2) Layout
            con Sidebar/Topbar, (3) Dashboard maestro con tarjetas base.
          </p>
        </footer>
      </div>
    </main>
  );
}


import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="rounded-xl border border-white/10 p-4">
        <nav className="space-y-2 text-sm">
          <div className="font-semibold text-white/70 mb-2">Admin</div>
          <ul className="space-y-1">
            <li>
              <Link href="/admin" className="block rounded px-2 py-1 hover:bg-white/10">
                🧭 Inicio
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="block rounded px-2 py-1 hover:bg-white/10">
                👤 Usuarios
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}

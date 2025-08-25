import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Panel <b>ADMIN</b></h2>
      <p className="text-white/70">Accesos rápidos</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/users" className="rounded-2xl bg-white/10 px-3 py-1.5 hover:bg-white/20">
          👤 Gestión de usuarios
        </Link>
      </div>
    </div>
  );
}

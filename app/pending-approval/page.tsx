// Server Component
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function PendingApprovalPage() {
  const session = await getServerSession(authOptions);

  // Si no hay sesión, volver al login
  if (!session?.user?.id) {
    redirect("/login");
  }

  const name = session.user?.name ?? "Usuario";
  const email = session.user?.email ?? "";
  const role = (session.user as any)?.role ?? "—";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg p-6">
        <div className="mt-10 rounded-2xl border bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h1 className="text-2xl font-bold">Cuenta pendiente de aprobación</h1>
            <p className="mt-1 text-sm text-gray-600">
              Hola <b>{name}</b>{email ? <> ({email})</> : null}. Tu solicitud fue recibida.
              Un administrador deberá aprobar tu acceso antes de que puedas ingresar.
            </p>
          </header>

          <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-900">
            <b>Rol solicitado:</b> {String(role)}
          </div>

          <div className="mt-5 space-y-2 text-sm text-gray-600">
            <p>
              Si creés que esto es un error, contactá al administrador del club.
            </p>
            <p>
              También podés <a className="underline" href="/redirect">reintentar</a> más tarde.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </form>
            <a
              href="/login"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              title="Volver al login"
            >
              Volver al login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadmin } from "@/lib/auth-helpers";

export default async function SuperadminPage() {
  const session = await getServerSession(authOptions);
  if (!isSuperadmin(session)) return null;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Panel Superadmin (beta)</h1>
      <p className="mt-2 text-gray-500">Acceso exclusivo para usuarios SUPERADMIN.</p>
    </div>
  );
}

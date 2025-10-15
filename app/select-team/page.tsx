import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SelectTeamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Seleccioná un equipo (pendiente TeamPicker)</h1>
      <p className="mt-2 text-gray-500">Esta pantalla será reemplazada por el selector de equipo.</p>
    </div>
  );
}

import RoleGate from "@/components/auth/RoleGate";
import dynamic from "next/dynamic";

const ConfigForm = dynamic(() => import("./ConfigForm"), { ssr: false });

export default function SuperAdminConfigPage() {
  return (
    <RoleGate allow={["SUPERADMIN"]}>
      <main className="min-h-[60vh] px-6 py-10">
        <h1 className="text-2xl font-bold">Configuración Global · SUPERADMIN</h1>
        <p className="mt-2 text-sm text-gray-600">Administra la configuración general y por equipo de la plataforma.</p>
        <section className="mt-8">
          <ConfigForm />
        </section>
      </main>
    </RoleGate>
  );
}

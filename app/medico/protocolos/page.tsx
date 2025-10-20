// src/app/med/protocolos/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default function MedProtocolosPage() {
  return (
    <RoleGate allow={["MEDICO"]}>
      <main className="p-6 space-y-3">
        <h1 className="text-xl font-bold">Protocolos — Médico</h1>
        <p className="text-sm text-gray-600">Próximamente.</p>
      </main>
    </RoleGate>
  );
}

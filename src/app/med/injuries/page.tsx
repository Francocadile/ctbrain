// src/app/med/injuries/page.tsx
import RoleGate from "@/components/auth/RoleGate";

export default function MedInjuriesPage() {
  return (
    <RoleGate allow={["MEDICO"]}>
      <main className="p-6 space-y-3">
        <h1 className="text-xl font-bold">Lesiones — Médico</h1>
        <p className="text-sm text-gray-600">Editor clínico (próximo paso).</p>
      </main>
    </RoleGate>
  );
}

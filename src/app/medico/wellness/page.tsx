// src/app/med/wellness/page.tsx
import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";

export default function MedWellnessPage() {
  return (
    <RoleGate allow={["MEDICO"]}>
      <main className="p-6 space-y-3">
        <BackToMedico />
        <h1 className="text-xl font-bold">Wellness — Médico</h1>
        <p className="text-sm text-gray-600">Próximamente.</p>
      </main>
    </RoleGate>
  );
}

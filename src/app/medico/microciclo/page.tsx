import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";
import CTDashboardPage from "@/app/ct/dashboard/page";

export default function MedicoMicrocicloPage() {
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10 space-y-4">
        <BackToMedico />
        <CTDashboardPage />
      </main>
    </RoleGate>
  );
}

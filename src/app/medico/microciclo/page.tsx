import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";
import CTDashboardPage from "@/app/ct/dashboard/page";

export default function MedicoMicrocicloPage() {
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <>
        <BackToMedico />
        <CTDashboardPage />
      </>
    </RoleGate>
  );
}

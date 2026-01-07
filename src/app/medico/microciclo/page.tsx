import RoleGate from "@/components/auth/RoleGate";
import CTLayout from "@/app/ct/layout";
import CTDashboardPage from "@/app/ct/dashboard/page";

export default function MedicoMicrocicloPage() {
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <CTLayout>
        <CTDashboardPage />
      </CTLayout>
    </RoleGate>
  );
}

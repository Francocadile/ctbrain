import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";
import ProtocolsEditorClient from "./ProtocolsEditorClient";

export const dynamic = "force-dynamic";

export default function MedicoProtocolsPage() {
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10">
        <BackToMedico />
        <ProtocolsEditorClient />
      </main>
    </RoleGate>
  );
}

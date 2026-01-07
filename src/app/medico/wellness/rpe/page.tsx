import RoleGate from "@/components/auth/RoleGate";
import BackToMedico from "@/components/ui/BackToMedico";
import CTRpePage from "@/app/ct/metrics/rpe/page";

export const dynamic = "force-dynamic";

export default function MedicoWellnessRpePage() {
  return (
    <RoleGate allow={["MEDICO", "ADMIN"]} requireTeam>
      <main className="min-h-[70vh] px-6 py-10 space-y-4">
        <BackToMedico />
        <section className="rounded-xl border bg-white p-4">
          <CTRpePage />
        </section>
      </main>
    </RoleGate>
  );
}

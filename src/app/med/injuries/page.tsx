import RoleGate from "@/components/auth/RoleGate";
import MedInjuriesClient from "./MedInjuriesClient";

export default function Page() {
  return (
    <RoleGate allow={["MEDICO"]}>
      <MedInjuriesClient />
    </RoleGate>
  );
}

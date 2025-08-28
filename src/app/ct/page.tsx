import { redirect } from "next/navigation";

export default function CTRoot() {
  // Ir directo al editor en tabla (con el header reducido si querés)
  redirect("/ct/plan-semanal?hideHeader=1");
}

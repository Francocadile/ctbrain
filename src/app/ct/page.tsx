// src/app/ct/page.tsx
import { redirect } from "next/navigation";

export default function CTDashboard() {
  // Dashboard CT: ir directo al editor en tabla (sin encabezado)
  redirect("/ct/plan-semanal?hideHeader=1");
}

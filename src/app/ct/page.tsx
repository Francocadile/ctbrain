// src/app/ct/page.tsx
// Página principal del CT: redirige SIEMPRE al editor de semana
// (mantengo hideHeader=1 para que no muestre el título grande)

"use server";

import { redirect } from "next/navigation";

export default async function CTIndex() {
  redirect("/ct/plan-semanal?hideHeader=1");
}

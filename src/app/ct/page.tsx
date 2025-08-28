// src/app/ct/page.tsx
import { redirect } from "next/navigation";

export default function CTIndex() {
  redirect("/ct/plan-semanal?hideHeader=1");
}

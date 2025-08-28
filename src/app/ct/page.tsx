import { redirect } from "next/navigation";

export default function CTRoot() {
  redirect("/ct/plan-semanal?hideHeader=1");
}

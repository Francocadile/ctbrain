// src/app/ct/exercises/page.tsx
import { redirect } from "next/navigation";

export default function ExercisesRedirect() {
  redirect("/ct/sessions/buscar");
}

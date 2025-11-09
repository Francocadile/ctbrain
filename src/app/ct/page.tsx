// src/app/ct/page.tsx
import { redirect } from "next/navigation";

export default function CTIndexRedirect() {
  // Landing del área CT → Dashboard (solo lectura)
  redirect("/ct/dashboard");
}

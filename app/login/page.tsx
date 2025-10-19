// src/app/login/page.tsx
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <LoginClient />
    </main>
  );
}
